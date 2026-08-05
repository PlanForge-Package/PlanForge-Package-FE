import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InvoiceDocument } from '@/components/invoice-document';
import { ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { ApiError, apiFetch, translateError } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import type { ArInvoiceDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Invoice — PlanForge',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: Props) {
  const { t } = await getDictionary();
  const { id } = await params;
  await requireUser(`/ar/invoices/${id}`);

  let invoice: ArInvoiceDetail;
  try {
    invoice = await apiFetch<ArInvoiceDetail>('be', `/api/ar/invoices/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.notFound) notFound();

    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.ar.invoices} />
        <ErrorNotice
          title={t.ar.loadInvoiceFailed}
          message={translateError(error, t, t.ar.loadInvoiceFailed)}
          status={error instanceof ApiError ? error.status : 0}
        />
        <Link href="/ar" className="text-sm underline underline-offset-4 text-subtle">
          {t.ar.backToAccountsLong}
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
          title={fill(t.ar.invoiceDocTitle, { number: invoice.number })}
          description={t.ar.invoiceDocDescription}
        />
      </div>

      <InvoiceDocument invoice={invoice} />
    </main>
  );
}
