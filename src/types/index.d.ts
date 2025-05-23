interface VideoStreamOptions {
    video: boolean;
    audio: boolean;
}

interface Filter {
    id: string;
    name: string;
    apply: (canvas: HTMLCanvasElement) => void;
}

interface RecordedVideo {
    blob: Blob;
    url: string;
}

interface FilterSelectorProps {
    filters: Filter[];
    selectedFilter: string;
    onFilterChange: (filterId: string) => void;
}

interface VideoRecorderProps {
    options: VideoStreamOptions;
    onRecordingComplete: (video: RecordedVideo) => void;
}

interface DownloadButtonProps {
    video: RecordedVideo | null;
}