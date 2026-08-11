"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { proxiedImage } from "@/lib/imageProxy";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/layouts/DashboardLayout";
import TableHeader from "@/components/common/TableHeader";
import Pagination from "@/components/common/Pagination";
import TableSkeleton from "@/components/common/TableSkeleton";
import DateTime from "@/components/common/DateTime";
import Action from "@/components/common/Action";
import TogglableSwitch from "@/components/common/TogglableSwitch";
import CategoriesDeleteModal from "@/components/common/CategoriesDeleteModal";
import { SearchX, X, ChevronLeft, ChevronRight, Plus, ChevronDown, Languages } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getAdminStories } from "@/store/slices/AdminStorySlices/adminStoryThunk";
import { updateAdminStory } from "@/store/slices/AdminStorySlices/updateAdminStoryThunk";
import { deleteAdminStory } from "@/store/slices/AdminStorySlices/deleteAdminStoryThunk";
import { toggleStoryPremiumStatus, toggleStoryStatus } from "@/store/slices/AdminStorySlices/adminStorySlice";
import { toast } from "react-hot-toast";
import { AdminStoryItem } from "@/types/AdminStoryTypes/adminStoryTypes";
import { getLanguages } from "@/store/slices/LanguageSlices/languageThunk";

const sortedMedia = (story: AdminStoryItem) =>
    [...story.media].sort((a, b) => a.sort_order - b.sort_order);

export default function AllAdminStory() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { stories, pagination, loading } = useAppSelector((state) => state.adminStory);
    const { languages } = useAppSelector((state) => state.language);
    const [languageId, setLanguageId] = useState<number | "">("");

    const [cacheBust] = useState(() => Date.now());
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [viewStory, setViewStory] = useState<AdminStoryItem | null>(null);
    const [modalPageIndex, setModalPageIndex] = useState(0);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);


 useEffect(() => {
    dispatch(getAdminStories({ page, limit }));
}, [dispatch, page, limit]);

useEffect(() => {
    dispatch(getLanguages({ page: 1, limit: 100 }));
}, [dispatch]);

    

    const openStory = (story: AdminStoryItem) => {
        setViewStory(story);
        setModalPageIndex(0);
    };

    const handleToggle = async (id: number, currentActive: boolean) => {
        dispatch(toggleStoryStatus(id));
        const formData = new FormData();
        formData.append("is_active", String(!currentActive));
        try {
            await dispatch(updateAdminStory({ id, formData })).unwrap();
        } catch {
            dispatch(toggleStoryStatus(id));
            toast.error("Failed to update status");
        }
    };


    const handleToggleIsPremium = async (id: number, currentActive: boolean) => {
    dispatch(toggleStoryPremiumStatus(id));
    const formData = new FormData();
    formData.append("is_premium", String(!currentActive));
    try {
        await dispatch(updateAdminStory({ id, formData })).unwrap();
    } catch {
        dispatch(toggleStoryPremiumStatus(id));
        toast.error("Failed to update status");
    }
};

    const handleDeleteConfirm = async () => {
        if (!deleteId) return;
        setDeleteLoading(true);
        try {
            await dispatch(deleteAdminStory(deleteId)).unwrap();
            toast.success("Story deleted successfully");
            dispatch(getAdminStories({ page, limit, language_id: languageId || undefined }));
        } catch {
            toast.error("Failed to delete story");
        } finally {
            setDeleteLoading(false);
            setDeleteId(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="px-4 sm:px-8 pt-4 pb-12 font-inter">

                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-[28px] font-semibold text-[#101828] font-poppins">Admin Stories</h1>
                    <button
                        onClick={() => router.push("/admin-story/generate")}
                        className="flex items-center gap-2 rounded-[10px] bg-[#2563EB] hover:bg-[#1D4ED8] px-4 py-2.5 text-sm font-medium text-white transition-all"
                    >
                        <Plus size={16} /> Add Story
                    </button>
                </div>
                  <div className="mb-4 flex flex-wrap  hidden items-center gap-3">
                    <div className="relative">
                        <Languages size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={languageId}
                            onChange={(e) => { setLanguageId(e.target.value ? Number(e.target.value) : ""); setPage(1); }}
                            className="h-10 min-w-[220px] appearance-none rounded-[10px] border border-gray-300 bg-white pl-9 pr-10 text-sm text-[#101828] outline-none transition-colors focus:border-blue-500"
                        >
                            <option value="">Default language</option>
                            {languages.map((lang) => (
                                <option key={lang.language_id} value={lang.language_id}>
                                    {lang.flag ? `${lang.flag} ` : ""}{lang.name} ({lang.code.toUpperCase()})
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    </div>
                    {languageId !== "" && (
                        <button
                            type="button"
                            onClick={() => { setLanguageId(""); setPage(1); }}
                            className="text-sm font-medium text-[#2563EB] hover:underline"
                        >
                            Reset
                        </button>
                    )}
                </div>

                <div className="overflow-hidden rounded-[10px] border border-gray-200 bg-white">
                    <div className="w-full overflow-x-auto">
                        <table className="min-w-[900px] w-full border-collapse text-left">
                            <TableHeader
                                showCheckbox={false}
                                columns={[
                                    { label: "ID" },
                                    { label: "Cover Image" },
                                    { label: "Image" },
                                    { label: "Title" },
                                    { label: "Category" },
                                    { label: "Content" },
                                    { label: "Status" },
                                     { label: "is_premium" },
                                    { label: "Created At" },
                                    { label: "Action", className: "text-center" },
                                ]}
                            />
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <TableSkeleton rows={limit} />
                                ) : stories.length > 0 ? (
                                    stories.map((story) => {
                                        const media = sortedMedia(story);
                                        const firstPage = media[0];
                                        return (
                                            <tr key={story.adminstory_id} className="transition-all duration-200 hover:bg-[#F9FAFB]">
                                                <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                                                    #{story.adminstory_id}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {story.cover_image ? (
                                                        <Image
                                                            src={proxiedImage(story.cover_image, cacheBust)!}
                                                            alt={`${story.title} cover`}
                                                            width={48}
                                                            height={48}
                                                            className="h-12 w-12 rounded-xl object-cover border border-gray-200"
                                                        />
                                                    ) : (
                                                        <div className="h-12 w-12 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                                            —
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {firstPage ? (
                                                        <div className="relative h-12 w-12 shrink-0">
                                                            <Image
                                                                src={proxiedImage(firstPage.image, cacheBust)!}
                                                                alt={story.title}
                                                                width={48}
                                                                height={48}
                                                                className="h-12 w-12 rounded-xl object-cover border border-gray-200"
                                                            />
                                                            {media.length > 1 && (
                                                                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                                                                    {media.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="h-12 w-12 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                                            —
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-[#101828] max-w-[160px]">
                                                    <p className="line-clamp-2">{story.title}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[#667085] whitespace-nowrap">
                                                    {story.category?.storycategory_name ?? "—"}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[#667085] max-w-[220px]">
                                                    <p className="line-clamp-2 leading-relaxed">{firstPage?.content ?? "—"}</p>
                                                    {media.length > 1 && (
                                                        <p className="mt-1 text-xs text-[#2563EB]">+{media.length - 1} more page{media.length - 1 > 1 ? "s" : ""}</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <TogglableSwitch
                                                        isActive={story.is_active}
                                                        onToggle={() => handleToggle(story.adminstory_id, story.is_active)}
                                                    />
                                                </td>

                                                 <td className="px-6 py-4">
                                                    <TogglableSwitch
                                                        isActive={story.is_premium}
                                                        onToggle={() => handleToggleIsPremium(story.adminstory_id, story.is_premium)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <DateTime
                                                        date={new Date(story.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                                                        time={new Date(story.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Action
                                                        showView
                                                        showEdit
                                                        showDelete
                                                        onView={() => openStory(story)}
                                                        onEdit={() => router.push(`/admin-story/edit/${story.adminstory_id}`)}
                                                        onDelete={() => setDeleteId(story.adminstory_id)}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="py-20">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF]">
                                                    <SearchX size={30} className="text-[#2563EB]" />
                                                </div>
                                                <h3 className="mt-5 text-xl font-semibold text-[#101828]">No Stories Found</h3>
                                                <p className="mt-2 text-[15px] text-[#667085]">No admin stories have been generated yet.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-6 w-full">
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        rowsPerPage={pagination.limit}
                        onPageChange={(newPage) => setPage(newPage)}
                        onRowsPerPageChange={(rows) => { setLimit(rows); setPage(1); }}
                        rowsPerPageOptions={[5, 10, 20, 50]}
                        showRowsPerPage
                        showPageInfo
                    />
                </div>
            </div>

            {/* View Modal */}
            {viewStory && (() => {
                const media = sortedMedia(viewStory);
                const currentPage = media[modalPageIndex];
                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
                        onClick={() => setViewStory(null)}
                    >
                        <div
                            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={proxiedImage(currentPage?.image, cacheBust) ?? "/globe.svg"}
                                        alt={viewStory.title}
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 rounded-xl object-cover border border-gray-200"
                                    />
                                    <div>
                                        <h2 className="text-[17px] font-semibold text-[#101828]">{viewStory.title}</h2>
                                        <p className="text-xs text-[#667085]">
                                            {viewStory.category?.storycategory_name} · #{viewStory.adminstory_id}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewStory(null)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="flex flex-wrap gap-3">
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${viewStory.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                                        {viewStory.is_active ? "Active" : "Inactive"}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                        {viewStory.category?.storycategory_name}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                        {new Date(viewStory.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                                    </span>
                                </div>

                                {media.length > 0 ? (
                                    <div className="rounded-xl border border-gray-100 bg-[#F9FAFB] p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[13px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                                                Page {modalPageIndex + 1} of {media.length}
                                            </p>
                                            {media.length > 1 && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setModalPageIndex((i) => Math.max(0, i - 1))}
                                                        disabled={modalPageIndex === 0}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setModalPageIndex((i) => Math.min(media.length - 1, i + 1))}
                                                        disabled={modalPageIndex === media.length - 1}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {currentPage && (
                                            <>
                                                <div className="relative h-56 w-full overflow-hidden rounded-xl border border-gray-200">
                                                    <Image
                                                        src={proxiedImage(currentPage.image, cacheBust)!}
                                                        alt={`Page ${modalPageIndex + 1}`}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <p className="text-sm text-[#344054] leading-7 whitespace-pre-wrap">{currentPage.content}</p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-xl bg-[#F9FAFB] border border-gray-100 p-5">
                                        <p className="text-sm text-[#667085]">No pages found for this story.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {deleteId !== null && (
                <CategoriesDeleteModal
                    onClose={() => setDeleteId(null)}
                    onConfirm={handleDeleteConfirm}
                    loading={deleteLoading}
                />
            )}
        </DashboardLayout>
    );
}
