'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

type Slab = {
  id: number;
  slab_code: string;
  material_name?: string;
  finish?: string;
  height?: string;
  width?: string;
  thickness?: string;
  warehouse_group?: string;
  status?: string;
  customer_name?: string;
  project_name?: string;
  item_description?: string;
  porosity?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  image_url?: string | null;
  match_group_code?: string | null;
};

const normalizeFinish = (value?: string) => {
  if (!value) return '';
  return value.trim();
};

const normalizeStatus = (value?: string) => {
  if (!value) return 'available';
  return value.toLowerCase();
};

const normalizeSlab = (data: Slab): Slab => {
  return {
    ...data,
    finish: normalizeFinish(data.finish),
    status: normalizeStatus(data.status),
  };
};

const sanitizeDimensionInput = (value: string) => {
  return value.replace(/[^\d./\s]/g, '').replace(/\s+/g, ' ').trimStart();
};

export default function SlabDetailPage() {
  const params = useParams<{ slab_code: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slabCode = params.slab_code;
  const returnTo = searchParams.get('returnTo') || '/slabs';

  const [slab, setSlab] = useState<Slab | null>(null);
  const [originalSlab, setOriginalSlab] = useState<Slab | null>(null);
  const [matchedSlabs, setMatchedSlabs] = useState<Slab[]>([]);

  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [finishOptions, setFinishOptions] = useState<string[]>([]);
  const [materialOptions, setMaterialOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const warehouseOptions = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    return letters.flatMap((letter) =>
      [1, 2, 3, 4, 5].map((number) => `${letter}${number}`)
    );
  }, []);

  const imagePreviewSrc = useMemo(() => {
    if (selectedImagePreviewUrl) return selectedImagePreviewUrl;
    return slab?.image_url || '';
  }, [selectedImagePreviewUrl, slab?.image_url]);

  useEffect(() => {
    const loggedIn = localStorage.getItem('loggedIn');

    if (loggedIn !== 'true') {
      window.location.href = '/';
      return;
    }

    const fetchSlab = async () => {
      try {
        const res = await fetch(`${apiBase}/slabs/${slabCode}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to load slab: ${errorText}`);
        }

        const data = await res.json();
        const normalized = normalizeSlab(data);

        setSlab(normalized);
        setOriginalSlab(normalized);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not load slab details'
        );
      } finally {
        setLoading(false);
      }
    };

    const fetchMatchedSlabs = async () => {
      setMatchesLoading(true);

      try {
        const res = await fetch(`${apiBase}/slabs/${slabCode}/matches`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          setMatchedSlabs([]);
          return;
        }

        const data = await res.json();
        const normalizedMatches = Array.isArray(data)
          ? data.map((item) => normalizeSlab(item))
          : [];

        setMatchedSlabs(normalizedMatches);
      } catch {
        setMatchedSlabs([]);
      } finally {
        setMatchesLoading(false);
      }
    };

    const fetchFinishOptions = async () => {
      try {
        const res = await fetch(`${apiBase}/finish-options`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('Failed to fetch finish options');
        }

        const data = await res.json();
        setFinishOptions(Array.isArray(data.finishes) ? data.finishes : []);
      } catch {
        setFinishOptions([]);
      }
    };

    const fetchMaterialOptions = async () => {
      try {
        const res = await fetch(`${apiBase}/material-options`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('Failed to fetch material options');
        }

        const data = await res.json();
        setMaterialOptions(Array.isArray(data.materials) ? data.materials : []);
      } catch {
        setMaterialOptions([]);
      }
    };

    const fetchStatusOptions = async () => {
      try {
        const res = await fetch(`${apiBase}/status-options`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('Failed to fetch status options');
        }

        const data = await res.json();
        setStatusOptions(Array.isArray(data.statuses) ? data.statuses : []);
      } catch {
        setStatusOptions([]);
      }
    };

    if (slabCode) {
      fetchSlab();
      fetchMatchedSlabs();
    }

    fetchFinishOptions();
    fetchMaterialOptions();
    fetchStatusOptions();
  }, [apiBase, slabCode]);

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  const refreshMatchedSlabs = async (code: string) => {
    try {
      const res = await fetch(`${apiBase}/slabs/${code}/matches`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        setMatchedSlabs([]);
        return;
      }

      const data = await res.json();
      setMatchedSlabs(
        Array.isArray(data) ? data.map((item) => normalizeSlab(item)) : []
      );
    } catch {
      setMatchedSlabs([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    window.location.href = '/';
  };

  const handleStartEdit = () => {
    setError('');
    setSelectedImageFile(null);

    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
      setSelectedImagePreviewUrl('');
    }

    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setError('');

    if (originalSlab) {
      setSlab({ ...originalSlab });
    }

    setSelectedImageFile(null);

    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
      setSelectedImagePreviewUrl('');
    }

    setIsEditing(false);
  };

  const handleImageChange = (file: File | null) => {
    setSelectedImageFile(file);

    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
      setSelectedImagePreviewUrl('');
    }

    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setSelectedImagePreviewUrl(objectUrl);
    }
  };

  const handleOpenImagePicker = () => {
    if (!isEditing) {
      setIsEditing(true);
    }

    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleSave = async () => {
    if (!slab) return;

    if (
      slab.status === 'reserved' &&
      (!slab.customer_name?.trim() || !slab.project_name?.trim())
    ) {
      setError('If Reserved input Customer and Project.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const formData = new FormData();

      formData.append('material_name', slab.material_name || '');
      formData.append('finish', slab.finish || '');
      formData.append('height', slab.height || '');
      formData.append('width', slab.width || '');
      formData.append('thickness', slab.thickness || '');
      formData.append('warehouse_group', slab.warehouse_group || '');
      formData.append('status', normalizeStatus(slab.status));
      formData.append('customer_name', slab.customer_name || '');
      formData.append('project_name', slab.project_name || '');
      formData.append('item_description', slab.item_description || '');
      formData.append('porosity', String(slab.porosity ?? false));

      if (selectedImageFile) {
        formData.append('image', selectedImageFile);
      }

      const res = await fetch(`${apiBase}/slabs/${slab.slab_code}`, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to update slab: ${errorText}`);
      }

      const updatedSlab = await res.json();
      const normalizedUpdated = normalizeSlab(updatedSlab);

      setSlab(normalizedUpdated);
      setOriginalSlab(normalizedUpdated);

      setSelectedImageFile(null);

      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
        setSelectedImagePreviewUrl('');
      }

      setIsEditing(false);
      await refreshMatchedSlabs(normalizedUpdated.slab_code);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save slab changes'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!slabCode) return;

    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/slabs/${encodeURIComponent(slabCode)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to delete slab: ${errorText}`);
      }

      router.push(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete slab.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const reservationInfoMissing =
    isEditing &&
    slab?.status === 'reserved' &&
    (!slab.customer_name?.trim() || !slab.project_name?.trim());

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={returnTo}
              className="inline-block rounded-lg bg-black px-4 py-2 text-white"
            >
              Back to Gallery
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-lg bg-gray-800 px-4 py-2 text-white sm:inline-block"
            >
              Logout
            </button>

            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="hidden rounded-lg bg-red-600 px-4 py-2 text-white sm:inline-block"
                >
                  Delete Slab
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || reservationInfoMissing}
                  className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-lg bg-gray-500 px-4 py-2 text-white"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {reservationInfoMissing && (
            <p className="mb-4 font-medium text-amber-700">
              If status is Reserved, enter Customer Name and Project Name.
            </p>
          )}

          {loading && <p className="text-black">Loading slab details...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {!loading && slab && (
            <>
              <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <div className="overflow-hidden rounded-xl border bg-white shadow">
                  <div className="aspect-[4/3] bg-gray-200">
  {imagePreviewSrc ? (
    <img
      src={imagePreviewSrc}
      alt={slab.material_name || slab.slab_code}
      className="h-full w-full object-cover"
    />
  ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-600">
                        No image available
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-3">
                      {(slab.image_url || imagePreviewSrc) && (
                        <a
                          href={`${apiBase}/slabs/${encodeURIComponent(
                            slab.slab_code
                          )}/image/download`}
                          className="inline-block rounded-lg border border-black px-4 py-2 text-black"
                        >
                          Download image
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={handleOpenImagePicker}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                      >
                        {slab.image_url || imagePreviewSrc
                          ? 'Replace image'
                          : 'Take / Upload image'}
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                      className="hidden"
                    />

                    {selectedImageFile && (
                      <p className="text-sm text-gray-700">
                        Selected file: {selectedImageFile.name}
                      </p>
                    )}

                    <p className="text-sm text-gray-600">
                      Image is mandatory. You can upload or replace it, but not
                      delete it.
                      {selectedImageFile
                        ? ' Click Save to apply the new image.'
                        : ''}
                    </p>
                  </div>
                </div>

                

                <div className="rounded-xl border bg-white p-6 shadow">
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-black">
                      {slab.slab_code}
                    </h1>

                    {matchedSlabs.length > 0 && (
                      <span className="rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                        Match
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="text-black">
                      <strong>Material:</strong>{' '}
                      {isEditing ? (
                        <select
                          value={slab.material_name || ''}
                          onChange={(e) =>
                            setSlab({ ...slab, material_name: e.target.value })
                          }
                          className="ml-2 w-full max-w-md rounded border px-2 py-1"
                        >
                          <option value="">Select material</option>
                          {materialOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        slab.material_name || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Finish:</strong>{' '}
                      {isEditing ? (
                        <select
                          value={slab.finish || ''}
                          onChange={(e) =>
                            setSlab({ ...slab, finish: e.target.value })
                          }
                          className="ml-2 w-full max-w-md rounded border px-2 py-1"
                        >
                          <option value="">Select finish</option>
                          {finishOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        slab.finish || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Height:</strong>{' '}
                      {isEditing ? (
                        <input
                          type="text"
                          value={slab.height || ''}
                          onChange={(e) =>
                            setSlab({
                              ...slab,
                              height: sanitizeDimensionInput(e.target.value),
                            })
                          }
                          inputMode="decimal"
                          pattern="^(?:\d+(?:\.\d+)?|\.\d+|\d+\s+\d+\/\d+|\d+\/\d+)$"
                          title="Use inches only: 120, 54, 0.75, 3/4, or 126 1/8"
                          className="ml-2 w-full max-w-md rounded border px-2 py-1"
                        />
                      ) : (
                        slab.height || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Width:</strong>{' '}
                      {isEditing ? (
                        <input
                          type="text"
                          value={slab.width || ''}
                          onChange={(e) =>
                            setSlab({
                              ...slab,
                              width: sanitizeDimensionInput(e.target.value),
                            })
                          }
                          inputMode="decimal"
                          pattern="^(?:\d+(?:\.\d+)?|\.\d+|\d+\s+\d+\/\d+|\d+\/\d+)$"
                          title="Use inches only: 120, 54, 0.75, 3/4, or 126 1/8"
                          className="ml-2 w-full max-w-md rounded border px-2 py-1"
                        />
                      ) : (
                        slab.width || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Thickness:</strong>{' '}
                      {isEditing ? (
                        <input
                          type="text"
                          value={slab.thickness || ''}
                          onChange={(e) =>
                            setSlab({
                              ...slab,
                              thickness: sanitizeDimensionInput(e.target.value),
                            })
                          }
                          inputMode="decimal"
                          pattern="^(?:\d+(?:\.\d+)?|\.\d+|\d+\s+\d+\/\d+|\d+\/\d+)$"
                          title="Use inches only: 120, 54, 0.75, 3/4, or 126 1/8"
                          className="ml-2 w-full max-w-md rounded border px-2 py-1"
                        />
                      ) : (
                        slab.thickness || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Warehouse Group:</strong>{' '}
                      {isEditing ? (
                        <select
                          value={slab.warehouse_group || ''}
                          onChange={(e) =>
                            setSlab({ ...slab, warehouse_group: e.target.value })
                          }
                          className="ml-2 w-full max-w-md rounded border px-2 py-1"
                        >
                          <option value="">Select location</option>
                          {warehouseOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        slab.warehouse_group || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Status:</strong>{' '}
                      {isEditing ? (
                        <select
                          value={slab.status || 'available'}
                          onChange={(e) =>
                            setSlab({ ...slab, status: e.target.value })
                          }
                          className="ml-2 w-full max-w-md rounded border px-2 py-1"
                        >
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        slab.status || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Customer Name:</strong>{' '}
                      {isEditing ? (
                        <input
                          type="text"
                          value={slab.customer_name || ''}
                          onChange={(e) =>
                            setSlab({ ...slab, customer_name: e.target.value })
                          }
                          className="ml-2 w-full max-w-md rounded border px-2 py-1"
                        />
                      ) : (
                        slab.customer_name || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Project Name:</strong>{' '}
                      {isEditing ? (
                        <input
                          type="text"
                          value={slab.project_name || ''}
                          onChange={(e) =>
                            setSlab({ ...slab, project_name: e.target.value })
                          }
                          className="ml-2 w-full max-w-md rounded border px-2 py-1"
                        />
                      ) : (
                        slab.project_name || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Item Description:</strong>{' '}
                      {isEditing ? (
                        <textarea
                          value={slab.item_description || ''}
                          onChange={(e) =>
                            setSlab({ ...slab, item_description: e.target.value })
                          }
                          className="ml-2 w-full max-w-md rounded border px-2 py-1 align-top"
                          rows={4}
                        />
                      ) : (
                        slab.item_description || '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Porosity:</strong>{' '}
                      {isEditing ? (
                        <select
                          value={
                            slab.porosity === true
                              ? 'true'
                              : slab.porosity === false
                              ? 'false'
                              : ''
                          }
                          onChange={(e) =>
                            setSlab({
                              ...slab,
                              porosity:
                                e.target.value === 'true'
                                  ? true
                                  : e.target.value === 'false'
                                  ? false
                                  : undefined,
                            })
                          }
                          className="ml-2 rounded border px-2 py-1"
                        >
                          <option value="">Select</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : slab.porosity === true ? (
                        'Yes'
                      ) : slab.porosity === false ? (
                        'No'
                      ) : (
                        '-'
                      )}
                    </div>

                    <div className="text-black">
                      <strong>Active:</strong>{' '}
                      {slab.is_active === true
                        ? 'Yes'
                        : slab.is_active === false
                        ? 'No'
                        : '-'}
                    </div>

                    <div className="text-black">
                      <strong>Created At:</strong> {slab.created_at || '-'}
                    </div>

                    <div className="text-black">
                      <strong>Updated At:</strong> {slab.updated_at || '-'}
                    </div>
                  </div>
                </div>
              </div>

              <section className="mt-8">
                <h2 className="mb-4 text-2xl font-semibold text-black">
                  Matched slabs from same block
                </h2>

                {matchesLoading && (
                  <p className="text-black">Loading matched slabs...</p>
                )}

                {!matchesLoading && matchedSlabs.length === 0 && (
                  <p className="text-black">No matched slabs found.</p>
                )}

                {!matchesLoading && matchedSlabs.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {matchedSlabs.map((matchedSlab) => (
                      <Link
                        key={matchedSlab.id}
                        href={
                          matchedSlab.slab_code
                            ? `/slabs/${encodeURIComponent(
                                matchedSlab.slab_code
                              )}?returnTo=${encodeURIComponent(returnTo)}`
                            : '#'
                        }
                        className="overflow-hidden rounded-xl border bg-white shadow hover:shadow-md"
                      >
                        <div className="aspect-[4/3] bg-gray-200">
                          {matchedSlab.image_url ? (
                            <img
                              src={matchedSlab.image_url}
                              alt={
                                matchedSlab.material_name || 'Matched slab image'
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-gray-600">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 p-4">
                          <p className="text-black">
                            Material: {matchedSlab.material_name || '-'}
                          </p>

                          <p className="text-black">
                            Finish: {matchedSlab.finish || '-'}
                          </p>

                          <p className="text-black">
                            Size: {matchedSlab.height || '-'} ×{' '}
                            {matchedSlab.width || '-'} ×{' '}
                            {matchedSlab.thickness || '-'}
                          </p>

                          <p className="text-black">
                            Warehouse Location:{' '}
                            {matchedSlab.warehouse_group || '-'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                )}<div className="rounded-xl border bg-white p-4 shadow sm:hidden">
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-lg bg-gray-800 px-4 py-2 text-white"
                    >
                      Logout
                    </button>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-white"
                      >
                        Delete Slab
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-black">
              Delete this slab?
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-black px-4 py-2 text-black"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}