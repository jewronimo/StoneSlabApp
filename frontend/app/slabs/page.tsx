'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { authHeaders, canEditSlabs, clearSession, getSession, type Role } from '../lib/auth';

type Slab = {
  id: number;
  slab_code?: string;
  material_name?: string;
  finish?: string;
  height?: string;
  width?: string;
  thickness?: string;
  warehouse_group?: string;
  thumbnail_url?: string | null;
  image_url?: string | null;
  match_group_code?: string | null;
  price_per_sqft?: number | null;
};

type PaginatedSlabResponse = {
  items: Slab[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

const MATERIAL_OPTIONS = ['Granite', 'Marble', 'Quartz', 'Travertine', 'Onyx', 'Limestone', 'Quartzite', 'Misc'];
const FINISH_OPTIONS = ['Flamed', 'Brushed', 'Polished', 'Honed', 'Leathered', 'Sandblasted'];
const STATUS_OPTIONS = ['available', 'reserved', 'used'];

export default function SlabsPage() {
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 21, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState<Role | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const materialFilter = searchParams.get('material') ?? '';
  const finishFilter = searchParams.get('finish') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const warehouseFilter = searchParams.get('warehouse_group') ?? '';
  const itemDescriptionFilter = searchParams.get('item_description') ?? '';
  const customerNameFilter = searchParams.get('customer_name') ?? '';
  const projectNameFilter = searchParams.get('project_name') ?? '';
  const maxPricePerSqft = searchParams.get('maxPricePerSqft') ?? '';
  const showInactive = searchParams.get('showInactive') === 'true';
  const porosityOnly = searchParams.get('porosity') === 'true';
  const currentPage = Number(searchParams.get('page') ?? '1') || 1;

  const warehouseOptions = useMemo(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').flatMap((l) => [1, 2, 3, 4, 5].map((n) => `${l}${n}`)), []);
  const currentListUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const updateParams = (updates: Record<string, string | boolean | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === false) params.delete(key);
      else params.set(key, String(value));
    });
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/');
      return;
    }

    setRole(session.role);

    const fetchSlabs = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('include_inactive', String(showInactive));
        params.set('porosity', String(porosityOnly));
        params.set('page', String(currentPage));
        params.set('page_size', '21');

        if (materialFilter) params.set('material_name', materialFilter);
        if (finishFilter) params.set('finish', finishFilter);
        if (statusFilter) params.set('status', statusFilter);
        if (warehouseFilter) params.set('warehouse_group', warehouseFilter);
        if (itemDescriptionFilter) params.set('item_description', itemDescriptionFilter);
        if (customerNameFilter) params.set('customer_name', customerNameFilter);
        if (projectNameFilter) params.set('project_name', projectNameFilter);
        if (maxPricePerSqft) {
          params.set('min_price_per_sqft', '0');
          params.set('max_price_per_sqft', maxPricePerSqft);
        }

        const res = await fetch(`/api/slabs?${params.toString()}`, { cache: 'no-store', headers: authHeaders(session) });
        if (!res.ok) throw new Error(await res.text());

        const data: PaginatedSlabResponse = await res.json();
        setSlabs(Array.isArray(data.items) ? data.items : []);
        setPagination({ page: data.page ?? 1, page_size: data.page_size ?? 21, total: data.total ?? 0, total_pages: data.total_pages ?? 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load slabs');
      } finally {
        setLoading(false);
      }
    };

    fetchSlabs();
  }, [router, showInactive, currentPage, materialFilter, finishFilter, statusFilter, warehouseFilter, itemDescriptionFilter, customerNameFilter, projectNameFilter, maxPricePerSqft, porosityOnly]);

  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

  const clearFilters = () => router.replace(pathname, { scroll: false });

  const matchGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    slabs.forEach((slab) => {
      if (!slab.match_group_code) return;
      counts.set(slab.match_group_code, (counts.get(slab.match_group_code) || 0) + 1);
    });
    return counts;
  }, [slabs]);

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-black md:text-3xl">Slab Gallery</h1>
          <div className="flex flex-col gap-3 sm:flex-row">
            {canEditSlabs(role) && <Link href="/slabs/new" className="rounded-lg bg-green-600 px-4 py-2 text-center text-white">Add Slab</Link>}
            <button onClick={handleLogout} className="rounded-lg bg-black px-4 py-2 text-white">Logout</button>
          </div>
        </div>

        <div className="mb-6 rounded-xl border bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="text" value={itemDescriptionFilter} onChange={(e) => updateParams({ item_description: e.target.value, page: '1' })} className="w-full rounded-lg border px-3 py-2 text-black" placeholder="Item description contains..." />
            <input type="text" value={customerNameFilter} onChange={(e) => updateParams({ customer_name: e.target.value, page: '1' })} className="w-full rounded-lg border px-3 py-2 text-black" placeholder="Customer name contains..." />
            <input type="text" value={projectNameFilter} onChange={(e) => updateParams({ project_name: e.target.value, page: '1' })} className="w-full rounded-lg border px-3 py-2 text-black" placeholder="Project name contains..." />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select value={materialFilter} onChange={(e) => updateParams({ material: e.target.value, page: '1' })} className="rounded-lg border px-3 py-2 text-black"><option value="">All materials</option>{MATERIAL_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}</select>
            <select value={finishFilter} onChange={(e) => updateParams({ finish: e.target.value, page: '1' })} className="rounded-lg border px-3 py-2 text-black"><option value="">All finishes</option>{FINISH_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}</select>
            <select value={statusFilter} onChange={(e) => updateParams({ status: e.target.value, page: '1' })} className="rounded-lg border px-3 py-2 text-black"><option value="">All statuses</option>{STATUS_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}</select>
            <select value={warehouseFilter} onChange={(e) => updateParams({ warehouse_group: e.target.value, page: '1' })} className="rounded-lg border px-3 py-2 text-black"><option value="">All warehouse groups</option>{warehouseOptions.map((v) => <option key={v} value={v}>{v}</option>)}</select>
          </div>
          <div className="mt-3 flex gap-3">
            <input type="number" step="0.01" min="0" value={maxPricePerSqft} onChange={(e) => updateParams({ maxPricePerSqft: e.target.value, page: '1' })} className="rounded-lg border px-3 py-2 text-black" placeholder="Max $ / sf" />
            <label className="flex items-center gap-2 text-sm font-medium text-black"><input type="checkbox" checked={showInactive} onChange={(e) => updateParams({ showInactive: e.target.checked, page: '1' })} />Show used / inactive</label>
            <label className="flex items-center gap-2 text-sm font-medium text-black"><input type="checkbox" checked={porosityOnly} onChange={(e) => updateParams({ porosity: e.target.checked, page: '1' })} />Porosity only</label>
            <button onClick={clearFilters} className="rounded-lg border border-black px-3 py-2 text-black">Clear filters</button>
          </div>
        </div>

        <p className="mb-4 text-sm text-gray-700">Showing {slabs.length} of {pagination.total} slab{pagination.total === 1 ? "" : "s"}</p>

        {loading && <p className="text-black">Loading slabs...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && slabs.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {slabs.map((slab) => {
              const hasMatches = !!slab.match_group_code && (matchGroupCounts.get(slab.match_group_code) || 0) > 1;
              const href = slab.slab_code ? `/slabs/${encodeURIComponent(slab.slab_code)}?returnTo=${encodeURIComponent(currentListUrl)}` : '#';

              return (
                <Link key={slab.id} href={href} className="group overflow-hidden rounded-xl border bg-white shadow transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative aspect-[4/3] bg-gray-200">
                    {slab.thumbnail_url || slab.image_url ? <img src={slab.thumbnail_url || slab.image_url || ''} alt={slab.material_name || 'Slab image'} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm text-gray-600">No image</div>}
                    {hasMatches && <span className="absolute right-3 top-3 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Match</span>}
                  </div>
                  <div className="space-y-1 p-4 text-black">
                    <p>Material: {slab.material_name || '-'}</p>
                    <p>Finish: {slab.finish || '-'}</p>
                    <p>Size: {slab.height || '-'} × {slab.width || '-'} × {slab.thickness || '-'}</p>
                    <p>Warehouse: {slab.warehouse_group || '-'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
