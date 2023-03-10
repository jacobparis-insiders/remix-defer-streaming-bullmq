import { redirect } from "@remix-run/node"
import { Form } from "@remix-run/react"
import crypto from "crypto"
import { processItemQueue } from "~/workers/processItem.server"

export async function action() {
  const hash = crypto.randomUUID()

  void processItemQueue.add(hash, null, {
    // specify the job id to avoid duplicated jobs
    jobId: hash,
  })

  return redirect("/items/" + hash)
}

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>
        Stream Progress Updates with Remix using Defer, Suspense, and Server
        Sent Events
      </h1>

      <Form method="post">
        <button type="submit"> Start long-running process </button>
      </Form>
    </div>
  )
}
