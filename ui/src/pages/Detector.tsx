import { useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Brain, RotateCcw, Sparkles, Upload } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/stores/auth";
import { personDataSchema } from "@/schemas/detector";

import { useVideoUpload } from "@/lib/hooks/use-video-upload";
import { useDetectionHistory, useDetect } from "@/lib/hooks/use-detection";

import { AppHeader } from "@/components/layout/AppHeader";
import {
  VideoUploader,
  OceanResults,
  DetectionHistory,
} from "@/components/detector";

export default function Detector() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const videoUpload = useVideoUpload();

  const { data: history, isLoading: historyLoading } = useDetectionHistory();
  const detectMutation = useDetect();

  const form = useForm({
    defaultValues: {
      name: "",
      age: 0,
      gender: "male" as "male" | "female",
    },
    validators: {
      onSubmit: personDataSchema,
    },
    onSubmit: async ({ value }) => {
      if (!videoUpload.selectedFile) {
        return;
      }

      await detectMutation.mutateAsync({
        file: videoUpload.selectedFile,
        name: value.name,
        age: value.age,
        gender: value.gender,
      });

      form.reset();
      videoUpload.reset();
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const handleGoToAdmin = () => {
    navigate({ to: "/admin" });
  };

  const handleReset = () => {
    form.reset();
    videoUpload.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <AppHeader
          user={user}
          onLogout={handleLogout}
          onGoToAdmin={user?.is_admin ? handleGoToAdmin : undefined}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  New Video Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <VideoUploader
                  selectedFile={videoUpload.selectedFile}
                  previewUrl={videoUpload.previewUrl}
                  isPlaying={videoUpload.isPlaying}
                  isMuted={videoUpload.isMuted}
                  isDragOver={videoUpload.isDragOver}
                  error={
                    !videoUpload.selectedFile && detectMutation.isPending
                      ? "Please select a video file"
                      : videoUpload.error
                  }
                  videoRef={videoUpload.videoRef}
                  handleFileChange={videoUpload.handleFileChange}
                  handleDragOver={videoUpload.handleDragOver}
                  handleDragLeave={videoUpload.handleDragLeave}
                  handleDrop={videoUpload.handleDrop}
                  togglePlayPause={videoUpload.togglePlayPause}
                  toggleMute={videoUpload.toggleMute}
                  reset={videoUpload.reset}
                />

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!videoUpload.selectedFile) {
                      return;
                    }
                    form.handleSubmit();
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <form.Field name="name">
                      {(field) => (
                        <div className="space-y-2">
                          <Label
                            htmlFor={field.name}
                            className="text-sm font-medium text-gray-700"
                          >
                            Name
                          </Label>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter full name"
                            disabled={detectMutation.isPending}
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                          />
                          {form.state.isSubmitted &&
                            field.state.meta.errors.length > 0 && (
                              <p className="text-sm text-red-500">
                                {field.state.meta.errors
                                  .map((e) => e.message)
                                  .join(", ")}
                              </p>
                            )}
                        </div>
                      )}
                    </form.Field>

                    <form.Field name="age">
                      {(field) => (
                        <div className="space-y-2">
                          <Label
                            htmlFor={field.name}
                            className="text-sm font-medium text-gray-700"
                          >
                            Age
                          </Label>
                          <Input
                            id={field.name}
                            type="number"
                            value={field.state.value || ""}
                            onChange={(e) =>
                              field.handleChange(e.target.valueAsNumber || 0)
                            }
                            onBlur={field.handleBlur}
                            placeholder="Enter age"
                            disabled={detectMutation.isPending}
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                          />
                          {form.state.isSubmitted &&
                            field.state.meta.errors.length > 0 && (
                              <p className="text-sm text-red-500">
                                {field.state.meta.errors
                                  .map((e) => e.message)
                                  .join(", ")}
                              </p>
                            )}
                        </div>
                      )}
                    </form.Field>

                    <form.Field name="gender">
                      {(field) => (
                        <div className="space-y-2">
                          <Label
                            htmlFor={field.name}
                            className="text-sm font-medium text-gray-700"
                          >
                            Gender
                          </Label>
                          <select
                            id={field.name}
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(
                                e.target.value as "male" | "female",
                              )
                            }
                            onBlur={field.handleBlur}
                            disabled={detectMutation.isPending}
                            className="w-full p-2 border border-gray-300 rounded-md transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                          {form.state.isSubmitted &&
                            field.state.meta.errors.length > 0 && (
                              <p className="text-sm text-red-500">
                                {field.state.meta.errors
                                  .map((e) => e.message)
                                  .join(", ")}
                              </p>
                            )}
                        </div>
                      )}
                    </form.Field>
                  </div>

                  <div className="flex gap-3">
                    <form.Subscribe
                      selector={(state) => [
                        state.canSubmit,
                        state.isSubmitting,
                      ]}
                    >
                      {([canSubmit, isSubmitting]) => (
                        <Button
                          type="submit"
                          disabled={
                            !canSubmit ||
                            isSubmitting ||
                            detectMutation.isPending ||
                            !videoUpload.selectedFile
                          }
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-300"
                          size="lg"
                        >
                          {detectMutation.isPending ? (
                            <>
                              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing Video...
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4 mr-2" />
                              Analyze Personality
                            </>
                          )}
                        </Button>
                      )}
                    </form.Subscribe>

                    <Button
                      type="button"
                      onClick={handleReset}
                      variant="outline"
                      size="lg"
                      className="px-6"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </form>

                {detectMutation.error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">
                      <pre>{detectMutation.error.message}</pre>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {detectMutation.data && (
              <OceanResults
                results={detectMutation.data.results}
                detectionId={detectMutation.data.id}
              />
            )}
          </div>

          <div className="space-y-6">
            <DetectionHistory history={history} isLoading={historyLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
