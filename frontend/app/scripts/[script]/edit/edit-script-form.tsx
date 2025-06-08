"use client";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Button} from "@/components/ui/button";
import {Save} from "lucide-react";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import Editor from "@monaco-editor/react";
import {useEffect, useState} from "react";
import {getLanguages} from "@/apis";
import {z} from "zod";
import {getImages, updateScriptCode, updateScriptInfo} from "@/apis";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {Script, AvailableLanguages} from "@/interfaces";
import {useRouter} from "next/navigation";

const formSchema = z.object({
    name: z.string(),
    description: z.string(),
    language: z.string(),
    image_id: z.string(),
    code: z.string()
});


export default function EditScriptForm({defaultValues}: {defaultValues: Script & {code: string}}) {

    const router = useRouter();

    const [availableLanguages, setAvailableLanguages] = useState<AvailableLanguages[]>([]);
    const [availableImages, setAvailableImages] = useState<{ id: string, name: string }[]>([]);

    const [tabValue, setTabValue] = useState<string>("details");

    useEffect(() => {
        const fetchNecessaryData = async () => {
            const languages = await getLanguages();
            setAvailableLanguages(languages);

            const res = await getImages();
            setAvailableImages(res.images.map((image) => ({id: image.id, name: image.name})))
        }
        void fetchNecessaryData();
    }, [])

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: defaultValues
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {

        const changedFields: Partial<z.infer<typeof formSchema>> = {};

        for (const key in values) {
            const typedKey = key as keyof z.infer<typeof formSchema>;
            if (values[typedKey] !== defaultValues[typedKey]) {
                changedFields[typedKey] = values[typedKey];
            }
        }

        if (Object.keys(changedFields).length === 0) {
            toast.info("No changes made.")
            return;
        }

        try{
            // Update script info
            const changedInfo: Partial<z.infer<typeof formSchema>> = {};
            for (const key in changedFields) {
                const typedKey = key as keyof z.infer<typeof formSchema>;
                if (key != 'code') {
                    changedInfo[typedKey] = values[typedKey];
                }
            }

            // Trim whitespace from name field if exists.
            if (Object.keys(changedFields).includes("name") && changedFields.name!) {
                changedFields.name = changedFields.name.trim()
            }
            // If there are changes to the script info object, the make update script info request
            if (Object.keys(changedInfo).length > 0) {
                await updateScriptInfo(defaultValues.id, changedFields);
            }

            // Update script code if necessary
            if (Object.keys(changedFields).includes('code') && changedFields.code!){
                const formData = new FormData()
                formData.append("script", new Blob([changedFields.code]))
                await updateScriptCode(defaultValues.id, formData);
            }
            router.push(`/scripts/${defaultValues.id}`);
            toast.success("Successfully updated script!")
        }catch (e) {
            if(typeof e == "string"){
                toast.error(e as string, {
                    closeButton: true
                });
            }
        }

    }

    return (
        <Form {...form} >
            <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-[60%] w-full">
                <div className={"flex justify-center"}>
                    <Tabs defaultValue="details" className="w-full" value={tabValue} onValueChange={setTabValue}>
                        <div className={"flex align-center w-full justify-between mb-2"}>
                            <TabsList>
                                <TabsTrigger value="details" className={"w-[150px]"}>Details</TabsTrigger>
                                <TabsTrigger value="code" className={"w-[150px]"}>Code</TabsTrigger>
                            </TabsList>
                            <Button type="submit" className={"hover:cursor-pointer"}><Save />Save Changes</Button>
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
                                                <Input placeholder="Script Name" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                This is your script&apos;s display name.
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
                                                Used to help identify what the script is supposed to accomplish.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="language"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Language</FormLabel>
                                            <FormControl>
                                                <Select {...field} onValueChange={(value) => field.onChange(value)}>
                                                    <SelectTrigger className={"min-w-[200px]"}>
                                                        <SelectValue placeholder="Language" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableLanguages.map(({name, extension}, index) => (
                                                            <SelectItem key={index} value={name.toLowerCase()}>
                                                                {name} ( {extension} )
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormDescription>
                                                This is the language that is being used in the script code. It defines how the script is executed given the appropriate extension.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="image_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Image</FormLabel>
                                            <FormControl>

                                                <Select {...field} onValueChange={(value) => field.onChange(value)}>
                                                    <SelectTrigger className={"min-w-[200px]"}>
                                                        <SelectValue placeholder="Image" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableImages.map(({id, name}, index) => (
                                                            <SelectItem key={index} value={id}>
                                                                {name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                            </FormControl>
                                            <FormDescription>
                                                This is the image that will be used when executing your script.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </TabsContent>
                        <TabsContent value="code" forceMount hidden={tabValue !== "code"}>
                            <div className={"border p-4 rounded"}>
                                <div className={"space-y-4"}>
                                    <div className={"flex space-x-2"}>
                                        <p>Editing Language: </p>
                                        <pre>{form.getValues("language")}</pre>
                                    </div>
                                    <Editor height={"70vh"}
                                            width={"100%"}
                                            defaultLanguage={form.getValues("language")}
                                            language={form.getValues("language")}
                                            value={form.getValues("code")}
                                            theme={"vs-dark"}
                                            onChange={(v) => form.setValue("code", v ? v : "")}

                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </form>
        </Form>
    )
}