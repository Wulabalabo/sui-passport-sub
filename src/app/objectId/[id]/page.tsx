import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ObjectIdPage({ params }: PageProps) {
  const { id } = await params;
  
  // 重定向到指定的图片URL
  redirect('https://r2.suisec.tech/Sui%20passport-min.png');
} 