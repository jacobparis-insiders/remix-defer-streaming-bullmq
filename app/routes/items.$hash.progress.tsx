import type { LoaderArgs } from "@remix-run/node"
import path from "path"

import fs from "fs"
import { processItemQueue } from "~/workers/processItem.server"
import type { Job } from "bullmq"
import { eventStream } from "remix-utils"
export async function loader({ request, params }: LoaderArgs) {
  const hash = params.hash as string
  if (!hash) {
    return new Response("Not found", { status: 404 })
  }

  const job = await processItemQueue.getJob(hash)
  if (!job) {
    return new Response("Not found", { status: 404 })
  }

  return eventStream(request.signal, function setup(send) {
    job.isCompleted().then((completed) => {
      if (completed) {
        send({ event: "progress", data: String(100) })
      }
    })

    processItemQueue.events.addListener("progress", onProgress)

    function onProgress({
      jobId,
      data,
    }: {
      jobId: string
      data: number | object
    }) {
      if (jobId !== hash) return

      send({ event: "progress", data: String(data) })

      if (data === 100) {
        console.log("progress is 100, removing listener")
        processItemQueue.events.removeListener("progress", onProgress)
      }
    }

    return function clear() {
      processItemQueue.events.removeListener("progress", onProgress)
    }
  })
}
