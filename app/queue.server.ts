import IORedis from "ioredis"
import type { Processor } from "bullmq"
import { QueueEvents } from "bullmq"
import { Queue, Worker } from "bullmq"

type AugmentedQueue = Queue & {
  events: QueueEvents
}

const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
})

type RegisteredQueue = {
  queue: Queue
  queueEvents: QueueEvents
  worker: Worker
}

// declare registeredQueues as a global variable
declare global {
  var __registeredQueues: Record<string, RegisteredQueue> | undefined;
}

const registeredQueues =
  global.__registeredQueues || (global.__registeredQueues = {});

/**
 *
 * @param name Unique name of the queue
 * @param processor
 */
export function registerQueue(name: string, processor: Processor) {
  if (!registeredQueues[name]) {
    const queue = new Queue(name, { connection })
    const queueEvents = new QueueEvents(name, { connection })
    const worker = new Worker(name, processor, {
      connection,
    })

    registeredQueues[name] = {
      queue,
      queueEvents,
      worker,
    }
  }

  const queue = registeredQueues[name].queue as AugmentedQueue
  queue.events = registeredQueues[name].queueEvents

  return queue
}
