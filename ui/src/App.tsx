import React, {useState, useRef} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {z} from "zod";
import {Card, CardContent, CardHeader, CardTitle} from "./components/ui/card";
import {Input} from "./components/ui/input";
import {Label} from "./components/ui/label";
import {Progress} from "./components/ui/progress";
import {Alert, AlertDescription} from "./components/ui/alert";
import {Button} from "./components/ui/button";
import {Badge} from "./components/ui/badge";
import {
    Upload,
    Calendar,
    Brain,
    Sparkles,
    Eye,
    Heart,
    Zap,
    Shield,
    Video,
    RotateCcw,
    TrendingUp,
    Play,
    Pause,
    Volume2,
    VolumeX
} from "lucide-react";

const PersonSchema = z.object({
    name: z.string().min(1, "Name is required"),
    age: z.number().min(1, "Age must be positive"),
    gender: z.enum(["male", "female"]),
});

const OceanResultSchema = z.object({
    openness: z.number().min(0).max(100),
    conscientiousness: z.number().min(0).max(100),
    extraversion: z.number().min(0).max(100),
    agreeableness: z.number().min(0).max(100),
    neuroticism: z.number().min(0).max(100),
});

type PersonData = z.infer<typeof PersonSchema>;
type OceanResult = z.infer<typeof OceanResultSchema>;

interface DetectionHistory {
    id: number;
    name: string;
    age: number;
    gender: string;
    results: OceanResult;
    created_at: string;
    video_url?: string;
}

const API_BASE = "http://localhost:5000/";

const oceanTraits = [
    {
        key: "openness",
        label: "Openness",
        description: "Imagination, creativity",
        gradient: "bg-gradient-to-r from-blue-500 to-cyan-400",
        icon: Eye,
        textColor: "text-blue-600",
        bgColor: "bg-blue-50"
    },
    {
        key: "conscientiousness",
        label: "Conscientiousness",
        description: "Organization, discipline",
        gradient: "bg-gradient-to-r from-green-500 to-emerald-400",
        icon: Shield,
        textColor: "text-green-600",
        bgColor: "bg-green-50"
    },
    {
        key: "extraversion",
        label: "Extraversion",
        description: "Social energy, assertiveness",
        gradient: "bg-gradient-to-r from-yellow-500 to-orange-400",
        icon: Zap,
        textColor: "text-yellow-600",
        bgColor: "bg-yellow-50"
    },
    {
        key: "agreeableness",
        label: "Agreeableness",
        description: "Cooperation, trust",
        gradient: "bg-gradient-to-r from-purple-500 to-pink-400",
        icon: Heart,
        textColor: "text-purple-600",
        bgColor: "bg-purple-50"
    },
    {
        key: "neuroticism",
        label: "Neuroticism",
        description: "Emotional stability",
        gradient: "bg-gradient-to-r from-red-500 to-rose-400",
        icon: Brain,
        textColor: "text-red-600",
        bgColor: "bg-red-50"
    },
];

export default function OceanDetector() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [personData, setPersonData] = useState<PersonData>({
        name: "",
        age: 0,
        gender: "male",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isDragOver, setIsDragOver] = useState(false);

    const queryClient = useQueryClient();

    const {data: history, isLoading: historyLoading} = useQuery({
        queryKey: ["detectionHistory"],
        queryFn: async (): Promise<DetectionHistory[]> => {
            const response = await fetch(`${API_BASE}/history`);
            if (!response.ok) throw new Error("Failed to fetch history");
            return response.json();
        },
    });

    const detectMutation = useMutation({
        mutationFn: async ({
                               file,
                               person,
                           }: {
            file: File;
            person: PersonData;
        }) => {
            const formData = new FormData();
            formData.append("video", file);
            formData.append("name", person.name);
            formData.append("age", person.age.toString());
            formData.append("gender", person.gender);

            const response = await fetch(`${API_BASE}/predict`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Detection failed");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["detectionHistory"]});
            handleReset();
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handlePersonDataChange = (field: keyof PersonData, value: string) => {
        setPersonData((prev) => ({
            ...prev,
            [field]: field === "age" ? parseInt(value) || 0 : value,
        }));
    };

    const handleReset = () => {
        setSelectedFile(null);
        setPreviewUrl("");
        setPersonData({name: "", age: 0, gender: "male"});
        setErrors({});
        setIsPlaying(false);
        setIsMuted(false);
    };

    const handleDetect = async () => {
        try {
            const validatedPerson = PersonSchema.parse(personData);
            setErrors({});

            if (!selectedFile) {
                setErrors({file: "Please select a video file"});
                return;
            }

            await detectMutation.mutateAsync({
                file: selectedFile,
                person: validatedPerson,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Record<string, string> = {};
                error.issues.forEach((err) => {
                    if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
                });
                setErrors(fieldErrors);
            }
        }
    };

    const getPersonalityInsight = (_trait: string, value: number) => {
        if (value >= 80) return "Very High";
        if (value >= 60) return "High";
        if (value >= 40) return "Moderate";
        if (value >= 20) return "Low";
        return "Very Low";
    };

    const getInsightColor = (value: number) => {
        if (value >= 80) return "bg-green-100 text-green-800";
        if (value >= 60) return "bg-blue-100 text-blue-800";
        if (value >= 40) return "bg-yellow-100 text-yellow-800";
        if (value >= 20) return "bg-orange-100 text-orange-800";
        return "bg-red-100 text-red-800";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <div className="max-w-7xl mx-auto p-6 space-y-8">
                <div className="text-center space-y-4">
                    <div
                        className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
                        <Brain className="w-8 h-8 text-white"/>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        OCEAN Personality Detection
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Discover the Big Five personality traits through advanced video analysis.
                        Upload a video and get detailed insights into personality dimensions through facial expressions and behavior.
                    </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-6">
                        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                                        <Upload className="w-5 h-5 text-white"/>
                                    </div>
                                    New Video Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div
                                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                                        isDragOver
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('video')?.click()}
                                >
                                    <Input
                                        id="video"
                                        type="file"
                                        accept="video/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />

                                    {previewUrl ? (
                                        <div className="space-y-4">
                                            <div
                                                className="relative w-80 h-60 mx-auto rounded-xl overflow-hidden shadow-lg bg-black">
                                                <video
                                                    ref={videoRef}
                                                    src={previewUrl}
                                                    className="w-full h-full object-contain"
                                                    controls={false}
                                                    muted={isMuted}
                                                    onPlay={() => setIsPlaying(true)}
                                                    onPause={() => setIsPlaying(false)}
                                                />
                                                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/50 rounded-lg px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                togglePlayPause();
                                                            }}
                                                            className="p-1 text-white hover:bg-white/20"
                                                        >
                                                            {isPlaying ? (
                                                                <Pause className="w-4 h-4"/>
                                                            ) : (
                                                                <Play className="w-4 h-4"/>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleMute();
                                                            }}
                                                            className="p-1 text-white hover:bg-white/20"
                                                        >
                                                            {isMuted ? (
                                                                <VolumeX className="w-4 h-4"/>
                                                            ) : (
                                                                <Volume2 className="w-4 h-4"/>
                                                            )}
                                                        </Button>
                                                    </div>
                                                    <div className="text-white text-xs">
                                                        {selectedFile?.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePlayPause();
                                                    }}
                                                    className="gap-2"
                                                >
                                                    {isPlaying ? (
                                                        <>
                                                            <Pause className="w-4 h-4"/>
                                                            Pause
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="w-4 h-4"/>
                                                            Preview
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReset();
                                                    }}
                                                    className="gap-2"
                                                >
                                                    <RotateCcw className="w-4 h-4"/>
                                                    Change Video
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div
                                                className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                                                <Video className="w-8 h-8 text-gray-400"/>
                                            </div>
                                            <div>
                                                <p className="text-lg font-medium text-gray-700">
                                                    Drop your video here, or click to browse
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Supports MP4, AVI, MOV, WebM up to 100MB
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {errors.file && (
                                        <p className="text-sm text-red-500 mt-2">{errors.file}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">Name</Label>
                                        <Input
                                            id="name"
                                            value={personData.name}
                                            onChange={(e) => handlePersonDataChange("name", e.target.value)}
                                            placeholder="Enter full name"
                                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.name && (
                                            <p className="text-xs text-red-500">{errors.name}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="age" className="text-sm font-medium text-gray-700">Age</Label>
                                        <Input
                                            id="age"
                                            type="number"
                                            value={personData.age || ""}
                                            onChange={(e) => handlePersonDataChange("age", e.target.value)}
                                            placeholder="Enter age"
                                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.age && (
                                            <p className="text-xs text-red-500">{errors.age}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="gender"
                                               className="text-sm font-medium text-gray-700">Gender</Label>
                                        <select
                                            id="gender"
                                            value={personData.gender}
                                            onChange={(e) => handlePersonDataChange("gender", e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleDetect}
                                        disabled={detectMutation.isPending}
                                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-300"
                                        size="lg"
                                    >
                                        {detectMutation.isPending ? (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2 animate-spin"/>
                                                Analyzing Video...
                                            </>
                                        ) : (
                                            <>
                                                <Brain className="w-4 h-4 mr-2"/>
                                                Analyze Personality
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        onClick={handleReset}
                                        variant="outline"
                                        size="lg"
                                        className="px-6"
                                    >
                                        <RotateCcw className="w-4 h-4"/>
                                    </Button>
                                </div>

                                {detectMutation.error && (
                                    <Alert className="border-red-200 bg-red-50">
                                        <AlertDescription className="text-red-700">
                                            Video analysis failed. Please try again with a clear face video.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        {detectMutation.data && (
                            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
                                            <TrendingUp className="w-5 h-5 text-white"/>
                                        </div>
                                        Video Personality Analysis Results
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-6">
                                        {oceanTraits.map((trait) => {
                                            const Icon = trait.icon;
                                            const value = detectMutation.data.results[trait.key as keyof OceanResult];

                                            return (
                                                <div key={trait.key}
                                                     className={`p-4 rounded-xl ${trait.bgColor} border border-gray-200`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${trait.gradient}`}>
                                                                <Icon className="w-4 h-4 text-white"/>
                                                            </div>
                                                            <div>
                                                                <h3 className={`font-semibold ${trait.textColor}`}>{trait.label}</h3>
                                                                <p className="text-xs text-gray-600">{trait.description}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div
                                                                className={`text-2xl font-bold ${trait.textColor}`}>{value}%
                                                            </div>
                                                            <Badge
                                                                className={`text-xs ${getInsightColor(value)} border-0`}>
                                                                {getPersonalityInsight(trait.key, value)}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <Progress
                                                            value={value}
                                                            className="h-3 bg-white/50"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                                        <Calendar className="w-5 h-5 text-white"/>
                                    </div>
                                    Recent Video Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {historyLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="animate-pulse">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                                    <div className="space-y-1 flex-1">
                                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : !history?.length ? (
                                    <div className="text-center py-8 space-y-3">
                                        <div
                                            className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                                            <Video className="w-8 h-8 text-gray-400"/>
                                        </div>
                                        <p className="text-gray-500">No video analysis history yet</p>
                                        <p className="text-sm text-gray-400">Upload your first video to get started</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {history.slice(0, 10).map((item) => (
                                            <Card key={item.id}
                                                  className="p-4 hover:shadow-md transition-shadow bg-white/50">
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div
                                                        className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span>{item.age} years</span>
                                                            <span>•</span>
                                                            <span className="capitalize">{item.gender}</span>
                                                            <span>•</span>
                                                            <Video className="w-3 h-3"/>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {new Date(item.created_at).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-5 gap-1">
                                                    {oceanTraits.map((trait) => (
                                                        <div key={trait.key} className="text-center">
                                                            <div className={`text-xs font-medium ${trait.textColor}`}>
                                                                {item.results[trait.key as keyof OceanResult]}%
                                                            </div>
                                                            <Progress
                                                                value={item.results[trait.key as keyof OceanResult]}
                                                                className="h-1 mt-1"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}