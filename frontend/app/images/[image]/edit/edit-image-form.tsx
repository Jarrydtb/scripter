"use client";

import {number, z} from "zod";
import { zodResolver} from "@hookform/resolvers/zod";
import { useForm} from "react-hook-form";
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {useEffect, useRef, useState} from "react";
import {createImage, updateImage} from "@/apis";
import {Textarea} from "@/components/ui/textarea";
import { toast } from "sonner"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import Editor from "@monaco-editor/react";
import {Cross, File, Save, Undo, X} from "lucide-react";
import {bytesFormatter} from "@/lib/utils";
import {useRouter} from "next/navigation";
import {IFile, Image} from "@/interfaces";
import {Close} from "@radix-ui/react-dialog";
import {onRefresh} from "next/dist/client/components/react-dev-overlay/pages/client";

const formSchema = z.object({
    name: z.string(),
    description: z.string(),
    dockerfileContent: z
        .string()
        .trim()
        .min(1, "Dockerfile cannot be empty")
        .refine(
            (val) =>
                val.toLowerCase().includes(`cmd "/bin/sh"`) || val.toLowerCase().includes(`cmd ["/bin/sh"]`) || val.toLowerCase().includes(`cmd "/bin/bash"`) || val.toLowerCase().includes(`cmd ["/bin/bash"]`) ,
            {
                message: 'Dockerfile must contain valid CMD command. Either "/bin/sh" or "/bin/bash"',
            }
        )
        .describe("A valid Dockerfile for building your container"),
    supporting: z.any(),
    added: z.any().optional(),
});

export default function EditImageForm({defaultValues, originalSupportingFiles}: {defaultValues: Image & { 'dockerfileContent': string }, originalSupportingFiles: IFile[]}) {

    const router = useRouter();

    const filesRef = useRef<HTMLInputElement>(null!);

    const [tabValue, setTabValue] = useState<string>("details");
    const [removed, setRemoved] = useState<number[]>([]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {...defaultValues, supporting: []},

    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try{
            const formData = new FormData();
            // Add name if changed
            if(values.name.trim() !== defaultValues.name.trim()) {
                formData.append("name", values.name);
            }
            // Add description if changed
            if(values.description !== defaultValues.description) {
                formData.append("description", values.description);
            }
            // Add removed files list if required
            if(removed.length > 0) {
                removed.map(rid => formData.append('removed', JSON.stringify(rid)))
            }
            // Add new files if necessary
            if(values.added){
                [...values.added].map(file => {
                    formData.append("added", file);
                })
            }
            // Add DockerFile if necessary
            if (values.dockerfileContent !== defaultValues.dockerfileContent) {
                formData.append("dockerfile", new Blob([values.dockerfileContent], {type: "text/plain"}), "Dockerfile");
            }

            if ([...formData.keys()].length == 0) {
                toast.info("No changes made; Nothing to update found")
                return;
            }

            await updateImage(defaultValues.id, formData);
            // Ensure file input is cleared after call.
            form.setValue('added', null)
            router.refresh()
            toast.success("Image updated successfully!");
        }catch (e) {
            if(typeof e == "string"){
                toast.error(e as string, {
                    closeButton: true
                });
            }
        }
    }

    const onError = (errors: typeof form.formState.errors) => {
        const firstError = Object.values(errors)[0];
        if (firstError?.message) {
            toast.error(String(firstError.message));
        }
    };


    return (

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="min-w-[60%] w-full">
                <div className={"flex justify-center"}>
                    <Tabs defaultValue="details" className="w-full" value={tabValue} onValueChange={setTabValue}>
                        <div className={"flex align-center w-full justify-between mb-2"}>
                            <TabsList>
                                <TabsTrigger value="details" className={"w-[200px]"}>Details</TabsTrigger>
                                <TabsTrigger value="dockerfile"  className={"w-[200px]"}>Dockerfile</TabsTrigger>
                            </TabsList>
                            <Button type="submit" className={"hover:cursor-pointer"}>
                                <Save />
                                Save Changes
                            </Button>
                        </div>
                        <TabsContent value="details" forceMount hidden={tabValue !== "details"}>
                            <div className={"border p-4 rounded space-y-8"}>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Image Name" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                This is your image&apos;s display name.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Brief Description" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Used to help identify what the image is supposed to be used for and what it supports.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />


                                <FormField
                                    control={form.control}
                                    name="added"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New files</FormLabel>
                                            <FormControl>
                                                <Input type={"file"}
                                                       multiple
                                                       onChange={(event) => {
                                                           field.onChange(event.target.files && event.target.files)
                                                       }}
                                                       ref={field.ref}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Used to help identify what the image is supposed to be used for and what it supports.
                                            </FormDescription>
                                            <FormMessage />

                                            <div className={"flex flex-col space-y-2"}>
                                                {form.getValues("added") && [...form.getValues("added")].map((file: File, index: number) => {
                                                    return (
                                                        <div key={index} className={"p-2 border w-full h-[50px] flex items-center justify-between"}>
                                                            <div className={"flex items-center gap-4"}>
                                                                <File />
                                                                {file.name}
                                                            </div>

                                                            <div className={"flex items-center gap-4"}>
                                                                {bytesFormatter(file.size)}
                                                            </div>

                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </FormItem>
                                    )}
                                />


                                <FormItem>
                                    <FormLabel>Existing Files</FormLabel>
                                    <FormControl>
                                        <div className={"flex flex-col space-y-2"}>
                                            {originalSupportingFiles && originalSupportingFiles.map((file: IFile, index: number) => {
                                                return (
                                                    <div key={index} className={"relative border w-full h-[50px] flex items-center justify-between"}>
                                                        <div className={`w-full p-2 flex items-center justify-between ${removed.includes(file.file_id) ? 'text-accent' : ''}`}>
                                                            <div className={`flex items-center gap-4`}>
                                                                <File />

                                                                {file.name}

                                                                {
                                                                    removed.includes(file.file_id) && (<i className={"text-primary"}>(Removed)</i>)
                                                                }
                                                            </div>

                                                            <div className={"flex items-center gap-4"}>
                                                                <div className={"flex items-center gap-4"} style={{fontSize: "14px"}}>
                                                                    {bytesFormatter(file.size)}
                                                                </div>

                                                                {(
                                                                    !removed.includes(file.file_id) ? (
                                                                        <Button variant={"outline"} className={"hover:cursor-pointer"} type={"button"} onClick={() => setRemoved(prevState => ([...prevState, file.file_id]))}>
                                                                            <X />
                                                                        </Button>
                                                                    ) :
                                                                        <Button variant={"outline"} className={"hover:cursor-pointer text-primary"} type={"button"} onClick={() => setRemoved(prevState => (prevState.filter(value => value !== file.file_id)))}>
                                                                            <Undo />
                                                                        </Button>
                                                                )}

                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </FormControl>
                                </FormItem>

                            </div>

                        </TabsContent>
                        <TabsContent value="dockerfile" forceMount hidden={tabValue !== "dockerfile"}>
                            <div className={"border p-4 rounded min-h-[200px] w-full"}>
                                <div className={"space-y-4"}>
                                    <FormField
                                        control={form.control}
                                        name={"dockerfileContent"}
                                        render={() => (
                                            <FormItem>
                                                <FormLabel>Dockerfile</FormLabel>
                                                <FormDescription>
                                                    A valid Dockerfile for building your container. Use Docker Hub for examples and names: <a href={"https://hub.docker.com/search?badges=official"} target={"_blank"} rel={"noreferrer noopener"} className={"text-blue-400"}>Docker Hub</a>
                                                    <br /><br />
                                                    Please note: the Dockerfile must contain a CMD command with either &quot;/bin/sh&quot; or &quot;/bin/bash&quot;
                                                </FormDescription>
                                                <FormControl>
                                                    <Editor height={"70vh"}
                                                            width={"100%"}
                                                            defaultLanguage={"dockerfile"}
                                                            value={form.getValues("dockerfileContent")}
                                                            theme={"vs-dark"}
                                                            onChange={(v) => form.setValue("dockerfileContent", v ? v : "")}

                                                    />
                                                </FormControl>
                                            </FormItem>

                                        )} />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </form>
        </Form>
    )
}
