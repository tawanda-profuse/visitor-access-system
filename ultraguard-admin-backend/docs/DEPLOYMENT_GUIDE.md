# Key Technical Considerations & Edge Cases

While Next.js is well-suited, keep these technical details in mind during infrastructure setup:

Hosting Environment (Serverless Cold Starts vs. Always-On Server):
If you host Next.js on serverless platforms (like Vercel), serverless functions can occasionally experience a "cold start" delay (200ms–1s) if no request has come in recently. For a physical gate, latency must be consistently low.

- Solution: Deploy the Next.js app as a standard Docker container on an always-on server (e.g., DigitalOcean, AWS EC2, or Render) so the Node.js process stays warm in memory continuously.

WebSockets / Persistent Connections:
If the intercom hardware relies on low-level persistent socket connections (like MQTT or raw WebSockets) rather than standard HTTP/HTTPS API calls, standard Next.js serverless handlers are not designed for long-lived socket state.

- Solution: If the hardware requires WebSockets, either handle the gate via standard HTTP REST requests, run Next.js on a custom Node.js server with ws/socket.io, or offload live web events to a managed real-time broker (like Pusher, Ably, or Supabase Realtime).