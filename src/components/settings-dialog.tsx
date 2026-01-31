"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export function SettingsDialog({ onSave }: { onSave?: () => void }) {
  const [open, setOpen] = useState(false);
  const [projectsPath, setProjectsPath] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/config")
        .then((r) => r.json())
        .then((data) => setProjectsPath(data.projectsPath || data.suggestedPath || ""));
    }
  }, [open]);

  const handleSave = async () => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectsPath }),
    });
    setOpen(false);
    onSave?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Set the folder where your projects live. projector will scan this directory for projects. Note: projector itself (if in this folder) will be excluded.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="projectsPath">Projects folder path</Label>
          <Input
            id="projectsPath"
            placeholder="/Users/you/repos"
            value={projectsPath}
            onChange={(e) => setProjectsPath(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
