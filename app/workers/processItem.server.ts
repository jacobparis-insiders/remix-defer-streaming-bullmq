import { registerQueue } from "~/queue.server"
import type { Job } from "bullmq"

export const processItemQueue = registerQueue(
  "PROCESS_ITEM",
  async function (job) {
    const fakeProgressTimer = new Promise<void>((resolve) => {
      let progress = 0
      const interval = setInterval(async () => {
        progress = Math.min(Math.ceil(progress + 1 + 5 * Math.random()), 100)

        console.info(`[JOB ${job.id}] progress: ${progress}`)
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
