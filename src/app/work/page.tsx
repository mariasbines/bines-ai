import type { Metadata } from 'next';
import { WorkProfile } from '@/components/WorkProfile';

export const metadata: Metadata = {
  title: 'Work',
  description:
    'Enterprise architect and co-founder of SynapseDx, taking on fractional enterprise AI and architecture work.',
};

export default function WorkPage() {
  return <WorkProfile />;
}
