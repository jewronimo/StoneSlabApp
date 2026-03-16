'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type CreateSlabResponse = {
  id?: number;
  slab_code?: string;
};

type SlabFormState = {
  material_name: string;
  finish: string;
  height: string;
  width: string;
  thickness: string;
  warehouse_group: string;
  status: string;
  customer_name: string;
  project_name: string;
  item_description: string;
  porosity: boolean;
};

const DEFAULT_MATERIAL_OPTIONS = [
  'Granite',
  'Marble',
  'Quartz',
  'Travertine',
  'Onyx',
  'Limestone',
  'Quartzite',
  'Misc',
];

const DEFAULT_FINISH_OPTIONS = [
  'Brushed',
  'Flamed',
  'Honed',
  'Leathered',
  'Polished',
  'Sandblasted',
];

const DEFAULT_STATUS_OPTIONS = ['available', 'reserved', 'used'];

const initialForm: SlabFormState = {
  material_name: 'Granite',
  finish: 'Polished',
  height: '',
  width: '',
  thickness: '',
  warehouse_group: '',
  status: 'available',
  customer_name: '',
  project_name: '',
  item_description: '',
  porosity: false,
};

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function sanitizeDimensionInput(value: string) {
  return value.replace(/[^\d./\s]/g, '').replace(/\s+/g, ' ').trimStart();
}

function buildCreateFormData(
  form: SlabFormState,
  imageFile: File,
  previousSlabCode?: string | null
) {
  const formData = new FormData();

  if (previousSlabCode) {
    formData.append('previous_slab_code', previousSlabCode);
  }

  formData.append('material_name', form.material_name);
  formData.append('finish', form.finish);
  formData.append('height', form.height.trim());
  formData.append('width', form.width.trim());
  formData.append('thickness', form.thickness.trim());
  formData.append('warehouse_group', form.warehouse_group.trim());
  formData.append('status', form.status);
  formData.append('porosity', String(form.porosity));

  const customerName = emptyToNull(form.customer_name);
  const projectName = emptyToNull(form.project_name);
  const itemDescription = emptyToNull(form.item_description);

  if (customerName) {
    formData.append('customer_name', customerName);
  }

  if (projectName) {
    formData.append('project_name', projectName);
  }

  if (itemDescription) {
    formData.append('item_description', itemDescription);
  }

  formData.append('image', imageFile);

  return formData;
}

export default function NewSlabPage() {
  const router = useRouter();

  const [form, setForm] = useState<SlabFormState>(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);

  const [materialOptions, setMaterialOptions] = useState(
    DEFAULT_MATERIAL_OPTIONS
  );
  const [finishOptions, setFinishOptions] = useState(DEFAULT_FINISH_OPTIONS);
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);

  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [lastSavedSlab, setLastSavedSlab] =
    useState<CreateSlabResponse | null>(null);
  const [previousMatchedSlabCode, setPreviousMatchedSlabCode] = useState<
    string | null
  >(null);
  const [matchedSequenceNumber, setMatchedSequenceNumber] = useState(1);

  const warehouseOptions = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    return letters.flatMap((letter) =>
      [1, 2, 3, 4, 5].map((number) => `${letter}${number}`)
    );
  }, []);

  useEffect(() => {
    const loggedIn = localStorage.getItem('loggedIn');

    if (loggedIn !== 'true') {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

        const [materialsRes, finishesRes, statusesRes] = await Promise.allSettled(
          [
            fetch(`${baseUrl}/material-options`, { cache: 'no-store' }),
            fetch(`${baseUrl}/finish-options`, { cache: 'no-store' }),
            fetch(`${baseUrl}/status-options`, { cache: 'no-store' }),
          ]
        );

        if (materialsRes.status === 'fulfilled' && materialsRes.value.ok) {
          const data = await materialsRes.value.json();
          if (Array.isArray(data.materials) && data.materials.length > 0) {
            setMaterialOptions(data.materials);
          }
        }

        if (finishesRes.status === 'fulfilled' && finishesRes.value.ok) {
          const data = await finishesRes.value.json();
          if (Array.isArray(data.finishes) && data.finishes.length > 0) {
            setFinishOptions(data.finishes);
          }
        }

        if (statusesRes.status === 'fulfilled' && statusesRes.value.ok) {
          const data = await statusesRes.value.json();
          if (Array.isArray(data.statuses) && data.statuses.length > 0) {
            setStatusOptions(data.statuses);
          }
        }
      } catch (err) {
        console.error('Failed to load slab options', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === 'height' || name === 'width' || name === 'thickness') {
      setForm((prev) => ({ ...prev, [name]: sanitizeDimensionInput(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageFile(e.target.files?.[0] ?? null);
  };

  const createSingleSlab = async (slabForm: SlabFormState, slabImage: File) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/slabs`, {
      method: 'POST',
      body: buildCreateFormData(slabForm, slabImage),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create slab: ${errorText}`);
    }

    return (await res.json()) as CreateSlabResponse;
  };

  const createMatchedSlab = async (
    slabForm: SlabFormState,
    slabImage: File,
    previousSlabCode: string
  ) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/slabs/matched`,
      {
        method: 'POST',
        body: buildCreateFormData(slabForm, slabImage, previousSlabCode),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create matched slab: ${errorText}`);
    }

    return (await res.json()) as CreateSlabResponse;
  };

  const finishFlow = () => {
  setShowMatchModal(false);
  setPreviousMatchedSlabCode(null);
  setMatchedSequenceNumber(1);
  setSuccessMessage('');
  setError('');
  router.push('/slabs');
};


  const handleModalYes = () => {
    setShowMatchModal(false);
    setError('');
    setSuccessMessage('');

    if (lastSavedSlab?.slab_code) {
      setPreviousMatchedSlabCode(lastSavedSlab.slab_code);
    }

    setMatchedSequenceNumber((prev) => prev + 1);
    setImageFile(null);
    setImageInputKey((prev) => prev + 1);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleModalNo = () => {
    finishFlow();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    if (!imageFile) {
      setError('Please upload an image.');
      setSubmitting(false);
      return;
    }

    try {
      const createdSlab =
        matchedSequenceNumber > 1 && previousMatchedSlabCode
          ? await createMatchedSlab(form, imageFile, previousMatchedSlabCode)
          : await createSingleSlab(form, imageFile);

      setLastSavedSlab(createdSlab);
      setSuccessMessage('Slab saved successfully.');
      setShowMatchModal(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not create slab.'
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const reservedSelected = form.status === 'reserved';

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-black md:text-3xl">
                Add New Slab
              </h1>

              {matchedSequenceNumber > 1 && (
                <span className="inline-flex w-fit rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                  Matched slab {matchedSequenceNumber}
                </span>
              )}
            </div>

            <Link
              href="/slabs"
              className="rounded-lg border border-black px-4 py-2 text-center text-black"
            >
              Back to Gallery
            </Link>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border bg-white p-4 shadow md:p-6"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Material name *
                </label>
                <select
                  name="material_name"
                  value={form.material_name}
                  onChange={handleChange}
                  required
                  disabled={loadingOptions}
                  className="w-full rounded-lg border px-3 py-2 text-black disabled:bg-gray-100"
                >
                  {materialOptions.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Finish *
                </label>
                <select
                  name="finish"
                  value={form.finish}
                  onChange={handleChange}
                  required
                  disabled={loadingOptions}
                  className="w-full rounded-lg border px-3 py-2 text-black disabled:bg-gray-100"
                >
                  {finishOptions.map((finish) => (
                    <option key={finish} value={finish}>
                      {finish}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Height *
                </label>
                <input
                  name="height"
                  value={form.height}
                  onChange={handleChange}
                  required
                  inputMode="decimal"
                  pattern="^(?:\d+(?:\.\d+)?|\.\d+|\d+\s+\d+\/\d+|\d+\/\d+)$"
                  title="Use inches only: 120, 54, 0.75, 3/4, or 126 1/8"
                  className="w-full rounded-lg border px-3 py-2 text-black"
                  placeholder="120"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Width *
                </label>
                <input
                  name="width"
                  value={form.width}
                  onChange={handleChange}
                  required
                  inputMode="decimal"
                  pattern="^(?:\d+(?:\.\d+)?|\.\d+|\d+\s+\d+\/\d+|\d+\/\d+)$"
                  title="Use inches only: 120, 54, 0.75, 3/4, or 126 1/8"
                  className="w-full rounded-lg border px-3 py-2 text-black"
                  placeholder="54"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Thickness *
                </label>
                <input
                  name="thickness"
                  value={form.thickness}
                  onChange={handleChange}
                  required
                  inputMode="decimal"
                  pattern="^(?:\d+(?:\.\d+)?|\.\d+|\d+\s+\d+\/\d+|\d+\/\d+)$"
                  title="Use inches only: 120, 54, 0.75, 3/4, or 126 1/8"
                  className="w-full rounded-lg border px-3 py-2 text-black"
                  placeholder="3/4"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Warehouse location *
                </label>
                <select
                  name="warehouse_group"
                  value={form.warehouse_group}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border px-3 py-2 text-black"
                >
                  <option value="">Select location</option>
                  {warehouseOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Status *
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  required
                  disabled={loadingOptions}
                  className="w-full rounded-lg border px-3 py-2 text-black disabled:bg-gray-100"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Customer name {reservedSelected ? '*' : ''}
                </label>
                <input
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  required={reservedSelected}
                  className="w-full rounded-lg border px-3 py-2 text-black"
                  placeholder={reservedSelected ? 'Required for reserved' : 'Optional'}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Project name {reservedSelected ? '*' : ''}
                </label>
                <input
                  name="project_name"
                  value={form.project_name}
                  onChange={handleChange}
                  required={reservedSelected}
                  className="w-full rounded-lg border px-3 py-2 text-black"
                  placeholder={reservedSelected ? 'Required for reserved' : 'Optional'}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-black">
                  Slab image *
                </label>
                <input
                  key={imageInputKey}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  required
                  className="w-full rounded-lg border px-3 py-2 text-black file:mr-3 file:rounded file:border-0 file:bg-gray-200 file:px-3 file:py-2"
                />
                {matchedSequenceNumber > 1 && (
                  <p className="mt-1 text-sm text-gray-600">
                    Fields were copied from the previous slab. Upload the image for this slab.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-black">
                Item description
              </label>
              <textarea
                name="item_description"
                value={form.item_description}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border px-3 py-2 text-black"
                placeholder="Color, notes, remarks..."
              />
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-black">
                <input
                  type="checkbox"
                  name="porosity"
                  checked={form.porosity}
                  onChange={handleChange}
                />
                Porous
              </label>
            </div>

            {reservedSelected && (
              <p className="mt-4 text-sm text-amber-800">
                Reserved slabs require customer name and project name.
              </p>
            )}

            {error && <p className="mt-4 text-red-600">{error}</p>}
            {successMessage && (
              <p className="mt-4 text-green-700">{successMessage}</p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save Slab'}
              </button>

              <Link
                href="/slabs"
                className="rounded-lg border border-black px-4 py-2 text-center text-black"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>

      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-black">
              Add another matched slab?
            </h2>

            <p className="mt-3 text-sm text-gray-700">
              Yes will open the next slab form with the current values copied over.
              You will still need to upload the next slab image.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleModalYes}
                className="rounded-lg bg-amber-500 px-4 py-2 text-white"
              >
                Yes, add matched slab
              </button>

              <button
                type="button"
                onClick={handleModalNo}
                className="rounded-lg border border-black px-4 py-2 text-black"
              >
                No, finish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}