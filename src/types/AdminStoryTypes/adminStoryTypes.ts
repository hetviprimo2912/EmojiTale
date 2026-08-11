export interface AdminStoryPayload {
    page: number;
    limit: number;
    search?: string;
    storycategory_id?: number;
    is_active?: boolean;
    language_id?: number;

}

export interface AdminStoryCategory {
    storycategory_id: number;
    storycategory_name: string;
    storycategory_image: string;
    storycategory_description: string;
     original_content?: string;
    createdAt: string;
    updatedAt: string;
}

export interface StoryMediaItem {
    storymedia_id: number;
    adminstory_id: number;
    image: string;
    content: string;
    sort_order: number;
    original_content?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AdminStoryItem {
    adminstory_id: number;
    title: string;
    storycategory_id: number;
    is_active: boolean;
    is_premium: boolean;
    cover_image?: string;
    createdAt: string;
    updatedAt: string;
     original_content?: string;
    category: AdminStoryCategory;
    media: StoryMediaItem[];
}

export interface AdminStoryPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface AdminStoryResponse {
    success: boolean;
    message: string;
    data: {
        language_id?: number | null;
        stories: AdminStoryItem[];
        pagination: AdminStoryPagination;
    };
}

export interface GenerateStoryResponse {
    success: boolean;
    message: string;
    data: {
        story: AdminStoryItem;
    };
}

export interface UpdateAdminStoryResponse {
    success: boolean;
    message: string;
    data: {
        story: AdminStoryItem;
    };
}

export interface DeleteAdminStoryResponse {
    success: boolean;
    message: string;
    data: {
        adminstory_id: number;
    };
}
