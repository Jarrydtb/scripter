export interface Image {
    id: string;
    name: string;
    description: string;
    status: number;
}

export interface Scheduled {
    id: number;
    enabled: boolean;
    script_id: string;
    cron: string;
    last_run: number;
    created_at: number;
    running: boolean;
}

export interface ImageLog {
    image: number;
    lines: string[];
    new_position: number;
    status: number;
}

export interface Script {
    id: string;
    language: string;
    name: string;
    description: string;
    image_id: string;
    image_name: string;
    created_at: number;
}

export interface ScriptResponse {
    scripts: Script[],
    page: number,
    limit: number,
    total: number
}

export interface Jobs {
    created_at: number;
    finished_at: number;
    container_id: string;
    script_id: string;
    id: number;
    status: number;
    message_id: string;
}

export interface JobLog {
    job: Jobs;
    lines: string[];
    new_position: number;
    job_status: number;
}

export interface JobResponse {
    history: Jobs[], page: number, limit: number, total: number
}

export interface AvailableLanguages {
    name: string;
    extension: string;
}

export interface IFile {
    file_id: number;
    name: string;
    size: number;
}