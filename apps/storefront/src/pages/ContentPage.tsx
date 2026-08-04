import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getContentPage } from '../lib/api';

export function ContentPage() {
  const { slug = 'about' } = useParams();
  const query = useQuery({ queryKey: ['content-page', slug], queryFn: () => getContentPage(slug), retry: false });
  if (query.isLoading) return <section className="content-page"><p>Loading…</p></section>;
  if (!query.data) return <section className="content-page"><p className="eyebrow">Information</p><h1>Page unavailable</h1><p>This page has not been published yet.</p></section>;
  const page = query.data;
  return <section className={`content-page ${page.heroImage ? 'content-page--with-hero' : ''}`}>{page.heroImage ? <div className="content-page__hero"><img src={page.heroImage} alt="" /></div> : null}<div className="content-page__body"><p className="eyebrow">{page.eyebrow || 'Information'}</p><h1>{page.title}</h1>{page.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}{page.sections?.map((section, index) => <article className="content-page__section" key={index}>{section.imageUrl ? <img src={section.imageUrl} alt="" /> : null}<div>{section.heading ? <h2>{section.heading}</h2> : null}{section.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</div></article>)}</div></section>;
}
