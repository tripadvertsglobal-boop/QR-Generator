export type Folder = {
  id: string;
  name: string;
  color: string | null;
};

export type QrCode = {
  id: string;
  short_slug: string;
  destination_url: string;
  name: string | null;
  is_active: boolean;
  scan_count: number;
  folder_id: string | null;
  tags: string[];
  created_at: string;
};
