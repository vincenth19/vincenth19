// Next.js Edge API Routes: https://nextjs.org/docs/api-routes/edge-api-routes

import { NextRequest } from 'next/server';

export const config = {
	runtime: 'experimental-edge',
};

// default export function need to be here so I can deploy to Cloudflare Page
export default async function handler(req: NextRequest): Promise<Response> {
	return new Response(JSON.stringify({ name: 'John Doe' }), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}
