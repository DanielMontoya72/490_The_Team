import { useUserProfile } from "@/hooks/useUserProfile";

export function MenteeNameDisplay({ menteeId }: { menteeId: string }) {
  const { data: profile } = useUserProfile(menteeId);

  if (!profile) {
    return <span>Loading...</span>;
  }

  return <span>{profile.first_name} {profile.last_name}</span>;
}
