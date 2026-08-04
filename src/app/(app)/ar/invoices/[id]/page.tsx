import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InvoiceDocument } from '@/components/invoice-document';
import { ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { ApiError, apiFetch, backendMessage } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import type { ArInvoiceDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '청구서 — PlanForge',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
  await requireUser(`/ar/invoices/${id}`);

  let invoice: ArInvoiceDetail;
  try {
    invoice = await apiFetch<ArInvoiceDetail>('be', `/api/ar/invoices/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.notFound) notFound();

    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="청구서" />
        <ErrorNotice
          title="청구서를 불러오지 못했습니다"
          message={backendMessage(error, '청구서를 불러오지 못했습니다.')}
          status={error instanceof ApiError ? error.status : 0}
        />
        <Link href="/ar" className="text-sm underline underline-offset-4 text-subtle">
          ← 거래처 목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 print:hidden">
        <Link
          href={`/ar/${invoice.accountId}`}
          className="text-sm underline underline-offset-4 text-subtle"
        >
          ← {invoice.account.name}
        </Link>
        <PageHeader
          title={`청구서 ${invoice.number}`}
          description="거래처에 보내는 문서입니다. 인쇄하거나 PDF 로 저장해 보냅니다."
        />
      </div>

      <InvoiceDocument invoice={invoice} />
    </main>
  );
}
