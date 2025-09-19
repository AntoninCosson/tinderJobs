import { NextResponse } from "next/server";

let latestOffers = []; 

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Received Offers:", body);
    latestOffers.push(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

}

export async function GET() {
  return NextResponse.json(latestOffers);
}
