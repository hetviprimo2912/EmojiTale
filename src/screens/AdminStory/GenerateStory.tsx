"use client";

import React, { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { proxiedImage } from "@/lib/imageProxy";
import { toast } from "react-hot-toast";
import { Loader2, ChevronDown, ChevronLeft, ChevronRight, Sparkles, ImageIcon, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { generateAdminStory } from "@/store/slices/AdminStorySlices/generateStoryThunk";
import { resetGenerateStory } from "@/store/slices/AdminStorySlices/generateStorySlice";
import { updateAdminStory } from "@/store/slices/AdminStorySlices/updateAdminStoryThunk";
import { resetUpdateAdminStory } from "@/store/slices/AdminStorySlices/updateAdminStorySlice";
import { getStoryCategories } from "@/store/slices/StoryCategorySlices/storyCategoryThunk";
import { AdminStoryItem } from "@/types/AdminStoryTypes/adminStoryTypes";

interface StoryPage {
    id: string;
    content: string;
    image: File | null;
    preview: string;
    fileName: string;
    storymedia_id?: number; // existing media id for edit
    originalContent?: string; // content as loaded, to detect edits
}

async function urlToFile(url: string, fileName: string): Promise<File> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type });
}

interface Props {
    editItem?: AdminStoryItem;
        extraSection?: React.ReactNode;

}

const makePage = (): StoryPage => ({
    id: Math.random().toString(36).slice(2),
    content: "",
    image: null,
    preview: "",
    fileName: "No file chosen",
});

export default function GenerateStory({ editItem , extraSection }: Props) {
    const dispatch = useAppDispatch();
    const router = useRouter();

    const isEdit = !!editItem;

    const { loading: generateLoading, success: generateSuccess } = useAppSelector((state) => state.generateStory);
    const { loading: updateLoading, success: updateSuccess } = useAppSelector((state) => state.updateAdminStory);

    const loading = isEdit ? updateLoading : generateLoading;
    const success = isEdit ? updateSuccess : generateSuccess;

    const { categories } = useAppSelector((state) => state.storyCategory);

    const [title, setTitle] = useState(editItem?.title ?? "");
    const [categoryId, setCategoryId] = useState<number | "">(editItem?.storycategory_id ?? "");
    const [isActive, setIsActive] = useState(editItem?.is_active ?? true);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string>(editItem?.cover_image ?? "");
    const [coverFileName, setCoverFileName] = useState("No file chosen");
    const [pages, setPages] = useState<StoryPage[]>(() => {
        if (editItem?.media?.length) {
            return [...editItem.media]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((m) => ({
                    id: String(m.storymedia_id),
                    content: m.content,
                    image: null,
                    preview: m.image,
                    fileName: "Existing image",
                    storymedia_id: m.storymedia_id,
                    originalContent: m.content,
                }));
        }
        return [makePage()];
    });
    const [activeIndex, setActiveIndex] = useState(0);
    const [removedMediaIds, setRemovedMediaIds] = useState<number[]>([]);

    const createdUrlsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        dispatch(getStoryCategories({ page: 1, limit: 100 }));
    }, [dispatch]);

    useEffect(() => {
        if (!success) return;
        toast.success(isEdit ? "Story updated successfully!" : "Story generated successfully!");
        if (isEdit) dispatch(resetUpdateAdminStory());
        else dispatch(resetGenerateStory());
        router.push("/admin-story/all");
    }, [success, dispatch, router, isEdit]);

    useEffect(() => {
        return () => {
            createdUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    const addPage = () => {
        setPages((prev) => [...prev, makePage()]);
        setActiveIndex(pages.length);
    };

    const removePage = (id: string) => {
        setPages((prev) => {
            if (prev.length <= 1) return prev;
            const index = prev.findIndex((p) => p.id === id);
            const page = prev[index];
            if (page.storymedia_id) setRemovedMediaIds((ids) => [...ids, page.storymedia_id!]);
            const next = prev.filter((p) => p.id !== id);
            setActiveIndex((current) => Math.min(current >= index ? Math.max(0, current - 1) : current, next.length - 1));
            return next;
        });
    };

    const updateContent = (id: string, content: string) => {
        setPages((prev) => prev.map((p) => (p.id === id ? { ...p, content } : p)));
    };

    const handleImageChange = (id: string, e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        createdUrlsRef.current.add(url);
        setPages((prev) => prev.map((p) => (p.id === id ? { ...p, image: file, preview: url, fileName: file.name } : p)));
    };

    const handleCoverImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        createdUrlsRef.current.add(url);
        setCoverImage(file);
        setCoverPreview(url);
        setCoverFileName(file.name);
    };

    const handleSubmit = async () => {
        const errors: string[] = [];
        if (!title.trim()) errors.push("Story title");
        if (!categoryId) errors.push("Story category");
        if (!isEdit && !coverImage) errors.push("Cover image");
        pages.forEach((page, i) => {
            if (!page.content.trim()) errors.push(`Page ${i + 1} text`);
            if (!isEdit && !page.image) errors.push(`Page ${i + 1} image`);
        });

        if (errors.length) {
            toast.error(`All fields are required: ${errors.join(", ")}`);
            return;
        }

        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("storycategory_id", String(categoryId));
        formData.append("is_active", String(isActive));
        if (coverImage) formData.append("cover_image", coverImage);

        if (isEdit) {
            formData.append("adminstory_id", String(editItem!.adminstory_id));

            // Brand-new pages (no storymedia_id): always send as content+images
            const newPages = pages.filter((p) => !p.storymedia_id);
            for (const page of newPages) {
                if (!page.image) { toast.error("Please choose an image for new pages"); return; }
                formData.append("content", page.content.trim());
                formData.append("images", page.image);
            }

            // Existing pages the user edited (content changed or image replaced):
            // backend has no in-place update, so remove the old media and re-add it as a new pair.
            const editedExistingPages = pages.filter(
                (p) => p.storymedia_id && (p.image || p.content.trim() !== p.originalContent)
            );
            const removeIds = [...removedMediaIds, ...editedExistingPages.map((p) => p.storymedia_id!)];

            for (const page of editedExistingPages) {
                const file = page.image ?? (await urlToFile(page.preview, `page-${page.storymedia_id}.jpg`));
                formData.append("content", page.content.trim());
                formData.append("images", file);
            }

            for (const id of removeIds) {
                formData.append("remove_media_ids", String(id));
            }
        } else {
            pages.forEach((page) => {
                formData.append("content", page.content.trim());
                formData.append("images", page.image as File);
            });
        }

        try {
            if (isEdit) {
                await dispatch(updateAdminStory({ id: editItem!.adminstory_id, formData })).unwrap();
            } else {
                await dispatch(generateAdminStory(formData)).unwrap();
            }
        } catch (error: any) {
            toast.error(error || "Something went wrong");
        }
    };

    const activePage = pages[activeIndex];

    return (
        <DashboardLayout>
            <div className="px-4 sm:px-8 pt-4 pb-12 font-inter">

                {/* Header */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF]">
                        <Sparkles size={20} className="text-[#2563EB]" />
                    </div>
                    <div>
                        <h1 className="text-[28px] font-semibold text-[#101828] font-poppins">
                            {isEdit ? "Edit Story" : "Generate Story"}
                        </h1>
                        <p className="text-sm text-[#667085]">
                            {isEdit ? "Update the story details and pages." : "Add pages with an image and text each to auto-generate a story."}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

                    {/* Left — Form */}
                    <div className="bg-white border border-gray-200 rounded-2xl flex flex-col">
                        <div className="border-b border-gray-100 px-6 py-5">
                            <h2 className="text-[17px] font-semibold text-[#101828]">Story Details</h2>
                            <p className="text-sm text-[#667085] mt-0.5">
                                {isEdit ? "Update the details below" : "Fill in the details to generate a new story"}
                            </p>
                        </div>

                        <div className="flex-1 p-6 space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block mb-2 text-[14px] font-semibold text-gray-700">
                                    Story Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter story title..."
                                    className="w-full h-12 rounded-[10px] border border-gray-300 bg-white px-4 text-[#101828] placeholder:text-gray-400 outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block mb-2 text-[14px] font-semibold text-gray-700">
                                    Story Category <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                                        className="w-full h-12 rounded-[10px] border border-gray-300 bg-white px-4 pr-12 text-[#101828] outline-none appearance-none focus:border-blue-500 transition-colors"
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.storycategory_id} value={cat.storycategory_id}>
                                                {cat.storycategory_name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block mb-2 text-[14px] font-semibold text-gray-700">Status</label>
                                <div className="relative">
                                    <select
                                        value={String(isActive)}
                                        onChange={(e) => setIsActive(e.target.value === "true")}
                                        className="w-full h-12 rounded-[10px] border border-gray-300 bg-white px-4 pr-12 text-[#101828] outline-none appearance-none focus:border-blue-500 transition-colors"
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                    <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                </div>
                            </div>

                            {/* Cover Image */}
                            <div>
                                <label className="block mb-2 text-[14px] font-semibold text-gray-700">
                                    Cover Image {!isEdit && <span className="text-red-500">*</span>}
                                </label>
                                <div className="flex overflow-hidden rounded-[10px] border border-gray-300">
                                    <label className="cursor-pointer border-r border-gray-300 bg-gray-100 px-4 py-2 text-xs font-medium text-[#101828] transition-colors hover:bg-gray-200 whitespace-nowrap">
                                        Choose Image
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleCoverImageChange}
                                        />
                                    </label>
                                    <span className="flex items-center px-3 text-xs text-gray-500 truncate">{coverFileName}</span>
                                </div>
                                {coverPreview && (
                                    <div className="mt-3">
                                        <Image
                                            src={proxiedImage(coverPreview)!}
                                            alt="Cover preview"
                                            width={112}
                                            height={112}
                                            unoptimized
                                            className="h-28 w-28 rounded-xl object-cover border border-gray-200"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Pages */}
                            <div>
                                <label className="block mb-2 text-[14px] font-semibold text-gray-700">
                                    Story Pages <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-4">
                                    {pages.map((page, index) => (
                                        <div
                                            key={page.id}
                                            onClick={() => setActiveIndex(index)}
                                            className={`rounded-xl border p-4 space-y-3 cursor-pointer transition-colors ${activeIndex === index ? "border-blue-400 bg-[#F8FAFF]" : "border-gray-200"}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-semibold text-gray-700">Page {index + 1}</h4>
                                                {pages.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex overflow-hidden rounded-[10px] border border-gray-300">
                                                <label className="cursor-pointer border-r border-gray-300 bg-gray-100 px-4 py-2 text-xs font-medium text-[#101828] transition-colors hover:bg-gray-200 whitespace-nowrap">
                                                    Choose Image
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleImageChange(page.id, e)}
                                                    />
                                                </label>
                                                <span className="flex items-center px-3 text-xs text-gray-500 truncate">{page.fileName}</span>
                                            </div>
                                            {page.preview && (
                                                <div className="mt-3">
                                                    <Image
                                                        src={proxiedImage(page.preview)!}
                                                        alt={`Page ${index + 1} preview`}
                                                        width={112}
                                                        height={112}
                                                        unoptimized
                                                        className="h-28 w-28 rounded-xl object-cover border border-gray-200"
                                                    />
                                                </div>
                                            )}

                                            <textarea
                                                value={page.content}
                                                onChange={(e) => updateContent(page.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder="Enter text content for this page..."
                                                rows={3}
                                                className="w-full resize-none rounded-[10px] border border-gray-300 px-3 py-2 text-sm text-[#101828] placeholder:text-gray-400 outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addPage}
                                        className="flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600"
                                    >
                                        <Plus size={16} /> Add Page
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => router.push("/admin-story/all")}
                                className="rounded-[10px] border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`flex items-center gap-2 rounded-[10px] px-6 py-2 text-sm font-medium text-white transition-all ${loading ? "cursor-not-allowed bg-blue-300" : "bg-[#2563EB] hover:bg-[#1D4ED8]"}`}
                            >
                                {loading ? (
                                    <><Loader2 size={16} className="animate-spin" /> {isEdit ? "Updating..." : "Generating..."}</>
                                ) : isEdit ? (
                                    "Update Story"
                                ) : (
                                    <><Sparkles size={16} /> Generate Story</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right — Preview */}
                    <div className="bg-white border border-gray-200 rounded-2xl flex flex-col sticky top-6 self-start">
                        <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-[17px] font-semibold text-[#101828]">{title.trim() || "Page Preview"}</h2>
                                <p className="text-sm text-[#667085] mt-0.5">Page {activeIndex + 1} of {pages.length}</p>
                            </div>
                            {pages.length > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                                        disabled={activeIndex === 0}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveIndex((i) => Math.min(pages.length - 1, i + 1))}
                                        disabled={activeIndex === pages.length - 1}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-center justify-center gap-4 p-6">
                            {activePage?.preview ? (
                                <div className="relative w-full h-[260px]">
                                    <Image
                                        src={proxiedImage(activePage.preview)!}
                                        alt={`Page ${activeIndex + 1}`}
                                        fill
                                        unoptimized
                                        className="rounded-xl object-cover border border-gray-200 shadow-sm"
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200">
                                        <ImageIcon size={32} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400">No image selected</p>
                                </div>
                            )}
                            {activePage?.content && (
                                <p className="text-sm text-gray-600 text-center leading-relaxed line-clamp-5 px-2">
                                    {activePage.content}
                                </p>
                            )}
                        </div>
                        <div className="mx-6 mb-6 rounded-xl bg-[#EEF4FF] border border-blue-100 p-4">
                            <p className="text-xs font-semibold text-[#2563EB] mb-1">How it works</p>
                            <p className="text-xs text-[#3B82F6] leading-relaxed">
                                Add one or more pages, each with its own image and text. All pages are submitted together to generate a multi-page story.
                            </p>
                        </div>
                    </div>
                </div>
                  {extraSection}
            </div>
        </DashboardLayout>
    );
}
