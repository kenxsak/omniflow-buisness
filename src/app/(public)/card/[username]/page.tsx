import { notFound } from 'next/navigation';
import { getDigitalCardByUsername, incrementCardViews } from '@/app/actions/digital-card-actions';
import { DigitalCard } from '@/lib/digital-card-types';
import { Metadata } from 'next';
import DigitalCardView from './digital-card-view';

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await getDigitalCardByUsername(username);

  if (!result.success || !result.card) {
    return {
      title: 'Digital Card Not Found',
    };
  }

  const card = result.card;

  return {
    title: card.seo.title || `${card.businessInfo.name} - Digital Card`,
    description: card.seo.description || card.businessInfo.description,
    keywords: card.seo.keywords,
    openGraph: {
      title: card.businessInfo.name,
      description: card.businessInfo.tagline || card.businessInfo.description,
      images: card.businessInfo.coverImage ? [card.businessInfo.coverImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: card.businessInfo.name,
      description: card.businessInfo.tagline || card.businessInfo.description,
      images: card.businessInfo.coverImage ? [card.businessInfo.coverImage] : [],
    },
  };
}

export default async function DigitalCardPage({ params }: PageProps) {
  const { username } = await params;
  const result = await getDigitalCardByUsername(username);

  if (!result.success || !result.card) {
    notFound();
  }

  const card = result.card;

  if (card.status !== 'active') {
    notFound();
  }

  await incrementCardViews(card.id);

  return <DigitalCardView card={card} />;
}
