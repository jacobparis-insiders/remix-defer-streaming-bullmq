import type { LoaderArgs } from "@remix-run/node"
import { ActionArgs, defer, redirect } from "@remix-run/node"
import { Await, Form, useLoaderData, useParams } from "@remix-run/react"
import path from "path"
import fs from "fs"
import { Suspense } from "react"
import { useEventSource } from "remix-utils"
import { processItemQueue } from "~/workers/processItem.server"

export async function loader({ params }: LoaderArgs) {
  const hash = params.hash
  if (!hash) {
    return redirect("/")
  }

  const job = await processItemQueue.getJob(hash)
  if (!job) {
    return redirect("/")
  }

  return defer({
    job: job.waitUntilFinished(processItemQueue.events, 30 * 1000),
  })
}

export default function Index() {
  const data = useLoaderData()
  const params = useParams()
  const progress = useEventSource(`/items/${params.hash}/progress`, {
    event: "progress",
  })

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>
        Stream Progress Updates with Remix using Defer, Suspense, and Server
        Sent Events
      </h1>
      <a href="/"> Back </a>

      <div
        style={{
          width: "200px",
          height: "200px",
          display: "grid",
          placeItems: "center",
          fontSize: "2rem",
          fontWeight: "bold",
          background: "#f0f0f0",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <Suspense fallback={<span> {progress}% </span>}>
          <Await resolve={data.job} errorElement={<p>Error loading img!</p>}>
            {(job) => <img alt="" src={job.img} />}
          </Await>
        </Suspense>
      </div>
    </div>
  )
}
