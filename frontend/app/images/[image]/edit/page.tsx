import EditImageForm from "@/app/images/[image]/edit/edit-image-form";
import {getImage, getImageDockerfile, getImageSupporting} from "@/apis";
import {notFound} from "next/navigation";

export default async function Page({params}: {params: Promise<{image: string}>}){
    const {image} = await params;

    const imageInfo = await getImage(image)

    if(!imageInfo){
        notFound()
    }

    const dockerFileContent = await getImageDockerfile(image)
    const supportingFiles = await getImageSupporting(image)

    return (
        <div style={{width:'100%',height:'100%', padding: '10px', boxSizing: 'border-box'}}>
            <EditImageForm
                defaultValues={{...imageInfo?.image, dockerfileContent: dockerFileContent}}
                originalSupportingFiles={supportingFiles.files}
            />
        </div>
    )
}