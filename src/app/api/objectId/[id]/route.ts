import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 返回指定的图片URL
    const imageUrl = "https://r2.suisec.tech/Sui%20passport-min.png";
    
    // 重定向到图片URL
    return NextResponse.redirect(imageUrl);
  } catch (error) {
    console.error('Error in objectId API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
