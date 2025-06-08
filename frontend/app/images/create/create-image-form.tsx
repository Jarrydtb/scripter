"use client";

import {z} from "zod";
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
import {useState} from "react";
import {createImage} from "@/apis";
import {Textarea} from "@/components/ui/textarea";
import { toast } from "sonner"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import Editor from "@monaco-editor/react";
import {File, Save} from "lucide-react";
import {bytesFormatter} from "@/lib/utils";
import {useRouter} from "next/navigation";

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
    supporting: z.any().optional()
});


export default function CreateImageForm() {

    const [tabValue, setTabValue] = useState<string>("details");

    const router = useRouter();

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            dockerfileContent: ""
        },

    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
         try{
             const formData = new FormData();
             formData.append("name", values.name);
             formData.append("description", values.description);
             formData.append("dockerfile", new Blob([values.dockerfileContent], {type: "text/plain"}), "Dockerfile");
             if(values.supporting){
                 [...values.supporting].map(file => {
                     formData.append("supporting", file);
                 })
             }
             await createImage(formData);
             router.push(`/images`)
             toast.success("Image created!");
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
                                    name="supporting"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Supporting files</FormLabel>
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
                                                {form.getValues("supporting") && [...form.getValues("supporting")].map((file: File, index: number) => {
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
