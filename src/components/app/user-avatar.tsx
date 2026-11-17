import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function UserAvatar({
  name,
  imageUrl,
  size = "default",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <Avatar size={size}>
      {imageUrl ? <AvatarImage src={imageUrl} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}
