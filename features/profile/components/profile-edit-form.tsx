"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  GraduationCap,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { updateProfile } from "../actions";
import { initials } from "@/lib/utils";

interface ProfileEditFormProps {
  userId: string;
  defaultValues: {
    fullName: string;
    bio: string;
    college: string;
    course: string;
    yearOfStudy: number;
    avatarUrl: string;
    skills: string[];
  };
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProfileEditForm({ userId, defaultValues }: ProfileEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const [fullName, setFullName] = React.useState(defaultValues.fullName);
  const [bio, setBio] = React.useState(defaultValues.bio);
  const [college, setCollege] = React.useState(defaultValues.college);
  const [course, setCourse] = React.useState(defaultValues.course);
  const [yearOfStudy, setYearOfStudy] = React.useState(defaultValues.yearOfStudy);
  const [avatarUrl, setAvatarUrl] = React.useState(defaultValues.avatarUrl);
  const [skills, setSkills] = React.useState<string[]>(defaultValues.skills);
  const [skillInput, setSkillInput] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed || skills.includes(trimmed) || skills.length >= 10) return;
    setSkills([...skills, trimmed]);
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Full name is required.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);

    const result = await updateProfile({
      fullName,
      bio,
      college,
      course,
      yearOfStudy,
      avatarUrl,
      skills,
    });

    setSaving(false);
    if (result.ok) {
      toast.success("Profile updated! ✅");
      router.push(`/profile/${userId}`);
      router.refresh();
    } else {
      toast.error("Failed to save", { description: result.error });
    }
  }

  return (
    <div className="space-y-8">
      {/* Avatar preview + URL */}
      <div className="flex items-center gap-5 rounded-xl border bg-muted/20 p-5">
        <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-soft">
          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
          <AvatarFallback className="text-xl font-bold bg-gradient-brand text-primary-foreground">
            {initials(fullName || "U")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <ImageIcon className="size-3.5" /> Avatar URL
          </Label>
          <Input
            id="avatar-url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Paste any image URL — Google profile photo works great.
          </p>
        </div>
      </div>

      {/* Basic info */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 border-b pb-3">
          <User className="size-4 text-primary" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Basic Info
          </h3>
        </div>

        <Field label="Full Name *" error={errors.fullName}>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Aarav Sharma"
          />
        </Field>

        <Field label="Bio">
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about yourself, your skills, and what you love working on..."
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 resize-none"
          />
        </Field>
      </div>

      {/* Academic info */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 border-b pb-3">
          <GraduationCap className="size-4 text-secondary" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Academic Info
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="College">
            <Input
              id="college"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="BMS College of Engineering"
            />
          </Field>
          <Field label="Course">
            <Input
              id="course"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="B.E. Computer Science"
            />
          </Field>
        </div>

        <Field label="Year of Study">
          <select
            id="year-of-study"
            value={yearOfStudy}
            onChange={(e) => setYearOfStudy(Number(e.target.value))}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {[1, 2, 3, 4, 5, 6].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Skills */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 border-b pb-3">
          <FileText className="size-4 text-accent" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Skills
          </h3>
          <span className="ml-auto text-[11px] text-muted-foreground">{skills.length}/10</span>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="gap-1 pr-1 text-xs">
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
          {skills.length === 0 && (
            <p className="text-xs text-muted-foreground">No skills added yet.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            id="skill-input"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="e.g. React, Figma, Python…"
            className="text-sm"
            disabled={skills.length >= 10}
          />
          <Button
            type="button"
            id="add-skill-btn"
            variant="outline"
            size="sm"
            onClick={addSkill}
            disabled={!skillInput.trim() || skills.length >= 10}
            className="shrink-0 gap-1"
          >
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Press Enter or click Add. Up to 10 skills.
        </p>
      </div>

      {/* Save + Cancel */}
      <div className="flex gap-3 border-t pt-6">
        <Button
          id="cancel-edit-btn"
          variant="ghost"
          onClick={() => router.back()}
          disabled={saving}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          id="save-profile-btn"
          variant="brand"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 gap-2"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
