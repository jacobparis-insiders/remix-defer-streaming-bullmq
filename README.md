# Stream BullMQ Job Progress with Remix using Defer, Suspense, and Server Sent Events

This is an example of how to use Remix's Defer feature in combination with an EventStream to stream progress updates of a BullMQ job to the client.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/jacobparis/remix-defer-streaming-progress-bullmq)

https://user-images.githubusercontent.com/5633704/222973633-ce8ccde2-ae0f-4880-8039-d11edea67c09.mov

Check out this guide for a [simpler example of defer and event streams without bull-mq](https://www.jacobparis.com/guides/remix-defer-streaming-progress)

## Server files

In `entry.server.tsx`, you must import `queue.server` to start the queue

```ts
import "./queue.server"
```

The `queue.server.ts` file provides a `registerQueue` function that will be used in your worker files to create their queues.

## Worker files

In `workers/processItem.server.ts`, you can see how to create a queue and process jobs.

This example function increments a counter from 0 to 100 and updates the job's progress every 500ms.

```ts
import { registerQueue } from "~/queue.server"
import type { Job } from "bullmq"

export const processItemQueue = registerQueue(
  "PROCESS_ITEM",
  async function (job: Job) {
    const fakeProgressTimer = new Promise<void>((resolve) => {
      let progress = 0
      const interval = setInterval(async () => {
        progress = Math.min(Math.ceil(progress + 1 + 5 * Math.random()), 100)

        await job.updateProgress(progress)

        if (progress === 100) {
          clearInterval(interval)
          resolve()
        }
      }, 500)
    })

    await fakeProgressTimer

    return {
      img: "https://placekitten.com/200/200",
    }
  }
)
```

## Running a job

In `app/routes/index.tsx`, you can see how to start a job

We're using a random hash as the job name and id, then redirecting to a dynamic route with the same id

```ts
import { processItemQueue } from "~/workers/processItem.server"

export async function action() {
  const hash = crypto.randomUUID()

  void processItemQueue.add(hash, null, {
    // specify the job id to avoid duplicated jobs
    jobId: hash,
  })

  return redirect("/items/" + hash)
}
```

## Loading the job data

In `app/routes/items.$hash.tsx`, you can see how to access the job data.

Since we are deferring the job, the page will load normally at first, and then when the job completes the page will update with the job data.

```ts
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
```

## Checking the job status

In `app/routes/items.$hash.progress.tsx`, we create an event stream and stream the job's progress

```ts
import { processItemQueue } from "~/workers/processItem.server"
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
```

In `app/routes/items.$hash.tsx`, we use the `useEventSource` hook to listen to the event stream and update the page with the progress

```ts
const progress = useEventSource(`/items/${params.hash}/progress`, {
  event: "progress",
})
```
