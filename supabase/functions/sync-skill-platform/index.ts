import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeetCodeStats {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number;
  acceptanceRate: number;
  contestRating?: number;
  contestRanking?: number;
  badges?: { name: string; icon: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platformName, username } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    let profileData: any = {};
    let certifications: any[] = [];
    let isVerified = false;

    if (platformName === 'leetcode') {
      // Fetch LeetCode data using GraphQL API
      const leetcodeData = await fetchLeetCodeData(username);
      if (leetcodeData) {
        profileData = leetcodeData;
        isVerified = true;
        
        // Create certifications from LeetCode data
        certifications.push({
          certification_name: 'LeetCode Problem Solver',
          certification_type: 'skill',
          score: `${leetcodeData.totalSolved} problems solved`,
          ranking: leetcodeData.ranking ? `#${leetcodeData.ranking}` : null,
          verification_url: `https://leetcode.com/${username}`,
          is_verified: true,
          verification_status: 'verified',
          metadata: {
            easy: leetcodeData.easySolved,
            medium: leetcodeData.mediumSolved,
            hard: leetcodeData.hardSolved,
            acceptanceRate: leetcodeData.acceptanceRate,
          }
        });

        if (leetcodeData.contestRating) {
          certifications.push({
            certification_name: 'LeetCode Contest Participant',
            certification_type: 'badge',
            score: `Rating: ${Math.round(leetcodeData.contestRating)}`,
            ranking: leetcodeData.contestRanking ? `#${leetcodeData.contestRanking}` : null,
            verification_url: `https://leetcode.com/${username}`,
            is_verified: true,
            verification_status: 'verified',
          });
        }

        // Add badges
        if (leetcodeData.badges && leetcodeData.badges.length > 0) {
          for (const badge of leetcodeData.badges) {
            certifications.push({
              certification_name: badge.name,
              certification_type: 'badge',
              badge_image_url: badge.icon,
              verification_url: `https://leetcode.com/${username}`,
              is_verified: true,
              verification_status: 'verified',
            });
          }
        }
      }
    } else if (platformName === 'hackerrank') {
      // HackerRank doesn't have a public API, but we can verify the profile exists
      const hackerrankData = await fetchHackerRankData(username);
      if (hackerrankData) {
        profileData = hackerrankData;
        isVerified = hackerrankData.exists;
        
        if (hackerrankData.badges) {
          for (const badge of hackerrankData.badges) {
            certifications.push({
              certification_name: badge.name,
              certification_type: 'badge',
              badge_image_url: badge.icon,
              verification_url: `https://www.hackerrank.com/${username}`,
              is_verified: true,
              verification_status: 'verified',
            });
          }
        }
      }
    } else if (platformName === 'codecademy') {
      // Codecademy has no public API - manual verification only
      profileData = {
        username,
        manualEntry: true,
        profileUrl: `https://www.codecademy.com/profiles/${username}`,
      };
    }

    // Update or insert platform connection
    const { data: platform, error: platformError } = await supabase
      .from('external_skill_platforms')
      .upsert({
        user_id: user.id,
        platform_name: platformName,
        username,
        profile_url: getProfileUrl(platformName, username),
        is_verified: isVerified,
        verified_at: isVerified ? new Date().toISOString() : null,
        last_synced_at: new Date().toISOString(),
        profile_data: profileData,
      }, {
        onConflict: 'user_id,platform_name',
      })
      .select()
      .single();

    if (platformError) {
      console.error('Platform upsert error:', platformError);
      throw platformError;
    }

    // Insert certifications
    if (certifications.length > 0 && platform) {
      for (const cert of certifications) {
        const { error: certError } = await supabase
          .from('external_certifications')
          .upsert({
            user_id: user.id,
            platform_id: platform.id,
            platform_name: platformName,
            ...cert,
          }, {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        if (certError) {
          console.error('Certification insert error:', certError);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      platform,
      certifications,
      profileData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-skill-platform:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchLeetCodeData(username: string): Promise<LeetCodeStats | null> {
  try {
    // LeetCode GraphQL query for user stats
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats: submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
          profile {
            ranking
            userAvatar
            realName
          }
          badges {
            name
            icon
          }
        }
        userContestRanking(username: $username) {
          rating
          globalRanking
          attendedContestsCount
        }
      }
    `;

    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { username },
      }),
    });

    if (!response.ok) {
      console.error('LeetCode API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.data?.matchedUser) {
      return null;
    }

    const user = data.data.matchedUser;
    const contest = data.data.userContestRanking;
    
    const stats = user.submitStats?.acSubmissionNum || [];
    const easy = stats.find((s: any) => s.difficulty === 'Easy')?.count || 0;
    const medium = stats.find((s: any) => s.difficulty === 'Medium')?.count || 0;
    const hard = stats.find((s: any) => s.difficulty === 'Hard')?.count || 0;

    return {
      username: user.username,
      totalSolved: easy + medium + hard,
      easySolved: easy,
      mediumSolved: medium,
      hardSolved: hard,
      ranking: user.profile?.ranking || 0,
      acceptanceRate: 0, // Would need additional query
      contestRating: contest?.rating,
      contestRanking: contest?.globalRanking,
      badges: user.badges?.map((b: any) => ({ name: b.name, icon: b.icon })) || [],
    };
  } catch (error) {
    console.error('Error fetching LeetCode data:', error);
    return null;
  }
}

async function fetchHackerRankData(username: string): Promise<any> {
  try {
    // HackerRank doesn't have a public API, but we can check if profile exists
    // This is a simplified check - in production you might use web scraping or their work API
    const response = await fetch(`https://www.hackerrank.com/rest/hackers/${username}/badges`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { exists: false, username };
    }

    const data = await response.json();
    
    return {
      exists: true,
      username,
      badges: data.models?.map((badge: any) => ({
        name: badge.badge_name,
        icon: badge.badge_icon,
        stars: badge.stars,
      })) || [],
    };
  } catch (error) {
    console.error('Error fetching HackerRank data:', error);
    return { exists: false, username };
  }
}

function getProfileUrl(platform: string, username: string): string {
  switch (platform) {
    case 'leetcode':
      return `https://leetcode.com/${username}`;
    case 'hackerrank':
      return `https://www.hackerrank.com/${username}`;
    case 'codecademy':
      return `https://www.codecademy.com/profiles/${username}`;
    default:
      return '';
  }
}
