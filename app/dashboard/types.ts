export type Folder = {
  id: string;
  name: string;
  color: string | null;
};

export type AbDestination = { url: string; weight: number };

export type QrCode = {
  id: string;
  short_slug: string;
  destination_url: string;
  name: string | null;
  is_active: boolean;
  scan_count: number;
  folder_id: string | null;
  tags: string[];
  active_from: string | null;
  active_until: string | null;
  has_password: boolean;
  ab_destinations: AbDestination[] | null;
  created_at: string;
};
