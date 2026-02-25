export default {
  async fetch(_request: Request, _env: any, _ctx: ExecutionContext): Promise<Response> {
    return new Response(
      "Backfill worker placeholder. Use `wrangler d1 execute` for backfills.",
      { headers: { "content-type": "text/plain" } }
    );
  },
};
