import {
    ImageLog,
    Scheduled,
    Image,
    Script,
    ScriptResponse,
    AvailableLanguages,
    JobLog,
    JobResponse, IFile
} from "@/interfaces";
export interface ImageResponse {
    images: Image[],
    page: number,
    limit: number,
    total: number
}

const isServer = typeof window === 'undefined'
// const BASE_URL = isServer
//     ? 'https://nginx'
//     : ''

const BASE_URL = "http://127.0.0.1:8000";

export async function getImages(page: number = 0, limit: number = 100): Promise<ImageResponse> {
    try{
        const res = await fetch(`${BASE_URL}/api/image?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`);
        const images: ImageResponse = await res.json();
        return Promise.resolve(images)
    }catch (e) {
        return Promise.reject(e);
    }
}

export async function getImage(imageId: string): Promise<{image: Image}> {
    try{
        const res = await fetch(`${BASE_URL}/api/image/${imageId}`, {
            cache: "no-store"
        });
        if(res.ok){
            const image: { image: Image } = await res.json();
            return Promise.resolve(image)
        }else{
            return Promise.reject(null)
        }
    }catch (e) {
        return Promise.reject(null);
    }
}

export async function getImageDockerfile(imageId: string): Promise<string> {
    try{
        const res = await fetch(`${BASE_URL}/api/image/${imageId}/Dockerfile`);
        if(res.ok){
            return Promise.resolve(await res.text())
        }else{
            return Promise.reject(null)
        }
    }catch (e) {
        return Promise.reject(null);
    }
}

export async function getImageSupporting(imageId: string): Promise<{files: IFile[]}> {
    try{
        const res = await fetch(`${BASE_URL}/api/image/${imageId}/supporting`);
        if(res.ok){
            return Promise.resolve(await res.json())
        }else{
            return Promise.reject(null)
        }
    }catch (e) {
        return Promise.reject(null);
    }
}

export async function getImageLogs(imageId: string, lastPosition: number): Promise<ImageLog> {
    try{
        const res = await fetch(`${BASE_URL}/api/image/${imageId}/logs?last_position=${encodeURIComponent(lastPosition)}`)
        if (res.ok){
            return Promise.resolve(await res.json())
        } else if (res.status == 404) {
            return Promise.reject(await res.text())
        }
        return Promise.reject("Could not find job log")
    }catch (e) {
        console.log(e)
        return Promise.reject(e);
    }
}

export async function updateImage(imageId: string, formData: FormData): Promise<void>{
    try{
        const res = await fetch(`${BASE_URL}/api/image/${imageId}`, {
            method: 'PATCH',
            body: formData
        })
        if (res.ok){
            return Promise.resolve()
        } else if (res.status == 404) {
            return Promise.reject(await res.text())
        }
        return Promise.reject("Failed to update image");
    }catch (e) {
        return Promise.reject(e);
    }
}

export async function getScriptCode(scriptId: string): Promise<string> {
    try{
        const res = await fetch(`${BASE_URL}/api/script/${scriptId}/code`);
        return Promise.resolve(await res.text())
    }catch (e) {
        return Promise.reject(e);
    }
}

export async function createScript(formData: FormData): Promise<string> {
    try{
        const res = await fetch(`${BASE_URL}/api/script`, {
            method: 'POST',
            body: formData,
        });
        if (res.ok) {
            return Promise.resolve(await res.text())
        }else{
            return Promise.reject(await res.text())
        }
    }catch (e) {
        return Promise.reject(e);
    }
}

export async function buildImage(imageId: string): Promise<string> {
    try{
        const res = await fetch(`${BASE_URL}/api/image/${imageId}/build`, {
            method: 'POST'
        });
        if (res.ok) {
            return Promise.resolve(await res.text())
        }else{
            return Promise.reject(await res.text())
        }
    }catch (e) {
        return Promise.reject(e);
    }
}

export async function createImage(formData: FormData): Promise<string> {
    try{
        const res = await fetch(`${BASE_URL}/api/image`, {
            method: 'POST',
            body: formData,
        });
        if (res.ok) {
            return Promise.resolve(await res.text())
        }else{
            return Promise.reject(await res.text())
        }
    }catch (e) {
        return Promise.reject(e);
    }
}

export async function deleteImage(imageId: string): Promise<string> {
    try{
        const res = await fetch(`${BASE_URL}/api/image/${imageId}`, {
            method: 'DELETE',
        });
        if (res.ok) {
            return Promise.resolve(await res.text())
        }else{
            return Promise.reject(await res.text())
        }
    }catch (e) {
        return Promise.reject(e);
    }
}

export async function destroyImage(imageId: string): Promise<string> {
    try{
        const res = await fetch(`${BASE_URL}/api/image/${imageId}/destroy`, {
            method: 'PATCH',
        });
        if (res.ok) {
            return Promise.resolve(await res.text())
        }else{
            return Promise.reject(await res.text())
        }
    }catch (e) {
        return Promise.reject(e);
    }
}

export async function updateScriptInfo(scriptId: string, formData: Partial<object>): Promise<void> {
    try{
        const res = await fetch(`${BASE_URL}/api/script/${scriptId}`, {
            method: "PATCH",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData)
        });
        if (!res.ok) {
            return Promise.reject(await res.text())
        }
    }catch (e) {
        console.error(e);
        return Promise.reject(e);
    }
}

export async function updateScriptCode(scriptId: string, formData: FormData): Promise<void> {
    try{
        const res = await fetch(`${BASE_URL}/api/script/${scriptId}/code`, {
            method: "PATCH",
            body: formData
        });
        if (!res.ok) {
            return Promise.reject(await res.text())
        }
    }catch (e) {
        console.error(e);
        return Promise.reject(e);
    }
}

export async function getScheduled(scriptId: string, page: number = 0, limit: number = 100): Promise<{
    page: number,
    limit: number,
    total: number,
    schedules: Scheduled[]
}> {
    try {
        const res = await fetch(`${BASE_URL}/api/schedule?script_id=${encodeURIComponent(scriptId)}`);
        if(res.ok){
            return Promise.resolve(await res.json());
        }
        return Promise.reject(res.text())
    }catch (e) {
        console.error(e);
        return Promise.reject(e);
    }
}

export async function createSchedule(scriptId: string, formData: Partial<object>): Promise<void> {
    try {
        console.log(formData)
        const res = await fetch(`${BASE_URL}/api/schedule`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({...formData, script_id: scriptId})
        });
        if(res.ok) {
            return Promise.resolve();
        }
        return Promise.reject(res.text())
    }catch (e) {
        console.error(e);
        return Promise.reject(e);
    }
}



export async function updateSchedule(scheduleId: number, formData: Partial<object>): Promise<void> {
    try {
        const res = await fetch(`${BASE_URL}/api/schedule/${encodeURIComponent(scheduleId)}`, {
            method: "PATCH",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData)
        });
        if(res.ok) {
            return Promise.resolve();
        }
        return Promise.reject(res.text())
    }catch (e) {
        console.error(e);
        return Promise.reject(e);
    }
}

export async function deleteSchedule(scheduleId: number): Promise<void> {
    try {
        const res = await fetch(`${BASE_URL}/api/schedule/${encodeURIComponent(scheduleId)}`, {
            method: "DELETE",
        });
        if(res.ok) {
            return Promise.resolve();
        }
        return Promise.reject(res.text())
    }catch (e) {
        console.error(e);
        return Promise.reject(e);
    }
}


export async function getScriptJobs(scriptId: string, page: number = 0, limit: number = 100): Promise<JobResponse> {
    try{
        const res = await fetch(`${BASE_URL}/api/jobs/history/${scriptId}?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`)
        const jobs: JobResponse = await res.json();
        return Promise.resolve(jobs)
    }catch (e) {
        console.log(e)
        return Promise.reject(e);
    }
}

export async function getJobLogs(jobId: number, lastPosition: number): Promise<JobLog> {
    try{
        const res = await fetch(`${BASE_URL}/api/job/${jobId}?last_position=${encodeURIComponent(lastPosition)}`)
        if (res.ok){
            return Promise.resolve(await res.json())
        } else if (res.status == 404) {
            return Promise.reject(await res.text())
        }
        return Promise.reject("Could not find job log")
    }catch (e) {
        console.log(e)
        return Promise.reject(e);
    }
}

export async function deleteJob(jobId: number): Promise<void> {
    try{
        const res = await fetch(`${BASE_URL}/api/job/${jobId}`, {
            method: 'DELETE'
        })
        if (res.status == 204) {
            return Promise.resolve()
        } else if (res.status == 404) {
            return Promise.reject(await res.text())
        }
        return Promise.reject("Could not find job log")
    }catch (e) {
        console.log(e)
        return Promise.reject(e);
    }
}

export async function cancelJob(jobId: number): Promise<void> {
    try{
        const res = await fetch(`${BASE_URL}/api/job/${jobId}/kill`, {method: 'PATCH'})
        if (res.status == 204) {
            return Promise.resolve()
        } else if (res.status == 404) {
            return Promise.reject(await res.text())
        }
        return Promise.reject("Could not find job log")
    }catch (e) {
        console.log(e)
        return Promise.reject(e);
    }
}

export async function getLanguages(): Promise<AvailableLanguages[]> {
    try{
        const res = await fetch(`${BASE_URL}/api/general/languages`)
        if (res.ok){
            const data: {supported_languages: AvailableLanguages[]} = await res.json();
            return Promise.resolve(data.supported_languages)
        } else if (res.status == 404) {
            return Promise.reject(await res.text())
        }
        return Promise.reject("Could not find job log")
    }catch (e) {
        console.log(e)
        return Promise.reject(e);
    }
}


export async function getScript(scriptId: string): Promise<{ script: Script }> {
    try {
        console.log(`${BASE_URL}/api/script?_id=${scriptId}`)
        const res = await fetch(`${BASE_URL}/api/script?_id=${scriptId}`)
        if (res.ok){
            return Promise.resolve(await res.json())
        }else{
            return Promise.reject(res.text)
        }
    }catch (e) {
        return Promise.reject(e);
    }
}


export async function getScripts(page: number = 0, limit: number = 100): Promise<ScriptResponse> {
    try{
        console.log(`${BASE_URL}/api/script?page=${page}&limit=${limit}`)
        const res = await fetch(`${BASE_URL}/api/script?page=${page}&limit=${limit}`)
        const scripts: ScriptResponse = await res.json();
        return Promise.resolve(scripts)
    }catch (e) {
        console.log(e)
        return Promise.reject(e);
    }
}

export async function runScript(scriptId: string): Promise<{ job_id: number }> {
    try{
        const res = await fetch(`${BASE_URL}/api/script/${scriptId}`, {method: "POST"});
        if(res.status == 204 || res.status == 200) {
            return Promise.resolve(await res.json());
        }else if(res.status == 404) {
            return Promise.reject(await res.text());
        }else{
            return Promise.reject(res.statusText)
        }
    }catch (e) {
        console.error(e)
        return Promise.reject(e);
    }
}
export async function deleteScript(scriptId: string): Promise<void> {
    try {
        const res = await fetch(`${BASE_URL}/api/script/${scriptId}`, {method: "DELETE"});
        if(res.status == 204 || res.status == 200) {
            return Promise.resolve();
        }else if(res.status == 404) {
            return Promise.reject(await res.text());
        }else{
            return Promise.reject(res.statusText)
        }
    }catch (e) {
        return Promise.reject(e);
    }
}