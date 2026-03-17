'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Slab = {
  id: number;
  slab_code?: string;
  material_name?: string;
  finish?: string;
  height?: string;
  height_value?: number | null;
  width?: string;
  width_value?: number | null;
  thickness?: string;
  thickness_value?: number | null;
  warehouse_group?: string;
  status?: string;
  customer_name?: string | null;
  project_name?: string | null;
  item_description?: string | null;
  porosity?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
  match_group_code?: string | null;
  price_per_sqft?: number | null;
  square_feet?: number | null;
  total_price?: number | null;
};

export default function SlabsPage() {
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchTerm = searchParams.get('q') ?? '';
  const searchTerm2 = searchParams.get('q2') ?? '';
  const showSecondarySearch = searchParams.get('showSecondarySearch') === 'true';

  const materialFilter = searchParams.get('material') ?? '';
  const finishFilter = searchParams.get('finish') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const warehouseFilter = searchParams.get('warehouse_group') ?? '';

  const minHeight = searchParams.get('minHeight') ?? '';
  const minWidth = searchParams.get('minWidth') ?? '';
  const minThickness = searchParams.get('minThickness') ?? '';
  const maxPricePerSqft = searchParams.get('maxPricePerSqft') ?? '';
  const showInactive = searchParams.get('showInactive') === 'true';

  const warehouseOptions = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    return letters.flatMap((letter) =>
      [1, 2, 3, 4, 5].map((number) => `${letter}${number}`)
    );
  }, []);

  const currentListUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const updateParams = (updates: Record<string, string | boolean | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === false) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const formatPricePerSqft = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null;
    }

    return `$${value.toFixed(2)}/sf`;
  };

  useEffect(() => {
    const loggedIn = localStorage.getItem('loggedIn');

    if (loggedIn !== 'true') {
      window.location.href = '/';
      return;
    }

    const fetchSlabs = async () => {
      setLoading(true);
      setError('');

      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

        const params = new URLSearchParams();
        params.set('include_inactive', String(showInactive));

        if (statusFilter) params.set('status', statusFilter);
        if (warehouseFilter) params.set('warehouse_group', warehouseFilter);
        if (minHeight) params.set('min_height', minHeight);
        if (minWidth) params.set('min_width', minWidth);
        if (minThickness) params.set('min_thickness', minThickness);

        if (maxPricePerSqft) {
          params.set('min_price_per_sqft', '0');
          params.set('max_price_per_sqft', maxPricePerSqft);
        }

        const res = await fetch(`${apiBaseUrl}/slabs?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to fetch slabs: ${errorText}`);
        }

        const data = await res.json();
        setSlabs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load slabs from backend'
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlabs();
  }, [
    showInactive,
    statusFilter,
    warehouseFilter,
    minHeight,
    minWidth,
    minThickness,
    maxPricePerSqft,
  ]);

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    window.location.href = '/';
  };

  const clearFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  const materialOptions = useMemo(() => {
    return Array.from(
      new Set(
        slabs
          .map((slab) => slab.material_name?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [slabs]);

  const finishOptions = useMemo(() => {
    return Array.from(
      new Set(
        slabs
          .map((slab) => slab.finish?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [slabs]);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(
        slabs
          .map((slab) => slab.status?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [slabs]);

  const matchGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();

    slabs.forEach((slab) => {
      if (!slab.match_group_code) return;

      counts.set(
        slab.match_group_code,
        (counts.get(slab.match_group_code) || 0) + 1
      );
    });

    return counts;
  }, [slabs]);

  const filteredSlabs = useMemo(() => {
    return slabs.filter((slab) => {
      const searchableText = [
        slab.material_name,
        slab.finish,
        slab.status,
        slab.customer_name,
        slab.project_name,
        slab.item_description,
        slab.porosity === true
          ? 'porous'
          : slab.porosity === false
          ? 'non-porous'
          : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());

      const matchesSecondarySearch =
        showSecondarySearch && searchTerm2
          ? searchableText.includes(searchTerm2.toLowerCase())
          : true;

      const matchesMaterial = materialFilter
        ? slab.material_name === materialFilter
        : true;

      const matchesFinish = finishFilter ? slab.finish === finishFilter : true;

      return (
        matchesSearch &&
        matchesSecondarySearch &&
        matchesMaterial &&
        matchesFinish
      );
    });
  }, [
    slabs,
    searchTerm,
    searchTerm2,
    showSecondarySearch,
    materialFilter,
    finishFilter,
  ]);

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-black md:text-3xl">
            Slab Gallery
          </h1>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/slabs/new"
              className="rounded-lg bg-green-600 px-4 py-2 text-center text-white"
            >
              Add Slab
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-black px-4 py-2 text-white"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-xl border bg-white p-4 shadow">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => updateParams({ q: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-black"
                placeholder="Search material, finish, status, customer, project, description..."
              />

              <label className="flex items-center gap-2 text-sm font-medium text-black sm:whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showSecondarySearch}
                  onChange={(e) =>
                    updateParams({
                      showSecondarySearch: e.target.checked,
                      q2: e.target.checked ? searchTerm2 : null,
                    })
                  }
                />
                Add second search
              </label>
            </div>

            {showSecondarySearch && (
              <input
                type="text"
                value={searchTerm2}
                onChange={(e) => updateParams({ q2: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-black"
                placeholder="Second search term"
              />
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={materialFilter}
                onChange={(e) => updateParams({ material: e.target.value })}
                className="rounded-lg border px-3 py-2 text-black"
              >
                <option value="">All materials</option>
                {materialOptions.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>

              <select
                value={finishFilter}
                onChange={(e) => updateParams({ finish: e.target.value })}
                className="rounded-lg border px-3 py-2 text-black"
              >
                <option value="">All finishes</option>
                {finishOptions.map((finish) => (
                  <option key={finish} value={finish}>
                    {finish}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => updateParams({ status: e.target.value })}
                className="rounded-lg border px-3 py-2 text-black"
              >
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={warehouseFilter}
                onChange={(e) =>
                  updateParams({ warehouse_group: e.target.value })
                }
                className="rounded-lg border px-3 py-2 text-black"
              >
                <option value="">All warehouse groups</option>
                {warehouseOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                type="number"
                step="any"
                min="0"
                value={minHeight}
                onChange={(e) => updateParams({ minHeight: e.target.value })}
                className="rounded-lg border px-3 py-2 text-black"
                placeholder="Min height"
              />

              <input
                type="number"
                step="any"
                min="0"
                value={minWidth}
                onChange={(e) => updateParams({ minWidth: e.target.value })}
                className="rounded-lg border px-3 py-2 text-black"
                placeholder="Min width"
              />

              <input
                type="number"
                step="any"
                min="0"
                value={minThickness}
                onChange={(e) =>
                  updateParams({ minThickness: e.target.value })
                }
                className="rounded-lg border px-3 py-2 text-black"
                placeholder="Min thickness"
              />

              <input
                type="number"
                step="0.01"
                min="0"
                value={maxPricePerSqft}
                onChange={(e) =>
                  updateParams({ maxPricePerSqft: e.target.value })
                }
                className="rounded-lg border px-3 py-2 text-black"
                placeholder="Max $ / sf"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-black">
                <input
                  id="showInactive"
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) =>
                    updateParams({ showInactive: e.target.checked })
                  }
                />
                Show used / inactive slabs
              </label>

              <button
                onClick={clearFilters}
                className="rounded-lg border border-black px-3 py-2 text-black"
              >
                Clear filters
              </button>
            </div>

            <p className="text-sm text-gray-700">
              Showing {filteredSlabs.length} slab
              {filteredSlabs.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {loading && <p className="text-black">Loading slabs...</p>}

        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && filteredSlabs.length === 0 && (
          <p className="text-black">No slabs match the current filters.</p>
        )}

        {!loading && !error && filteredSlabs.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSlabs.map((slab) => {
              const hasMatches =
                !!slab.match_group_code &&
                (matchGroupCounts.get(slab.match_group_code) || 0) > 1;

              const href = slab.slab_code
                ? `/slabs/${encodeURIComponent(
                    slab.slab_code
                  )}?returnTo=${encodeURIComponent(currentListUrl)}`
                : '#';

              const priceBadge = formatPricePerSqft(slab.price_per_sqft);

              return (
                <Link
                  key={slab.id}
                  href={href}
                  className="group overflow-hidden rounded-xl border bg-white shadow transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] bg-gray-200">
                    {slab.thumbnail_url || slab.image_url ? (
                      <img
                        src={slab.thumbnail_url || slab.image_url || ''}
                        alt={slab.material_name || 'Slab image'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-600">
                        No image
                      </div>
                    )}

                    {hasMatches && (
                      <span className="absolute right-3 top-3 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                        Match
                      </span>
                    )}

                    {priceBadge && (
                      <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-black shadow">
                        {priceBadge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 p-4">
                    <p className="text-black">
                      Material: {slab.material_name || '-'}
                    </p>

                    <p className="text-black">
                      Finish: {slab.finish || '-'}
                    </p>

                    <p className="text-black">
                      Size: {slab.height || '-'} × {slab.width || '-'} ×{' '}
                      {slab.thickness || '-'}
                    </p>

                    <p className="text-black">
                      Warehouse Location: {slab.warehouse_group || '-'}
                    </p>
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
