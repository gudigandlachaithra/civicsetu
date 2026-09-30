import type { Profile, SchemeRules } from '@/types';

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export function checkEligibility(profile: Profile, rules: SchemeRules): EligibilityResult {
  const reasons: string[] = [];

  // Income check
  if (rules.max_income != null) {
    const income = profile.annual_family_income ?? profile.annual_income;
    if (income != null && income > rules.max_income) {
      reasons.push(
        `Income exceeds limit of ₹${rules.max_income.toLocaleString('en-IN')}`
      );
    }
  }

  // Age check
  if (rules.min_age != null) {
    if (profile.age != null && profile.age < rules.min_age) {
      reasons.push(`Minimum age requirement is ${rules.min_age} years`);
    }
  }
  if (rules.max_age != null) {
    if (profile.age != null && profile.age > rules.max_age) {
      reasons.push(`Maximum age limit is ${rules.max_age} years`);
    }
  }

  // Category check
  if (rules.allowed_categories && rules.allowed_categories.length > 0) {
    if (profile.category && !rules.allowed_categories.includes(profile.category)) {
      reasons.push(`Category ${profile.category} is not eligible`);
    }
  }

  // Gender check
  if (rules.gender) {
    if (profile.gender && profile.gender !== rules.gender) {
      reasons.push(`This scheme is for ${rules.gender} applicants only`);
    }
  }

  // Land check
  if (rules.min_land_acres != null) {
    if (profile.land_acres != null && profile.land_acres < rules.min_land_acres) {
      reasons.push(`Minimum land requirement is ${rules.min_land_acres} acres`);
    }
  }
  if (rules.max_land_acres != null) {
    if (profile.land_acres != null && profile.land_acres > rules.max_land_acres) {
      reasons.push(`Maximum land limit is ${rules.max_land_acres} acres`);
    }
  }

  // Education level check
  if (rules.allowed_education_levels && rules.allowed_education_levels.length > 0) {
    if (
      profile.education_level &&
      !rules.allowed_education_levels.includes(profile.education_level)
    ) {
      reasons.push(`Education level ${profile.education_level} is not eligible`);
    }
  }

  // Percentage check
  if (rules.min_percentage != null) {
    if (
      profile.last_exam_percentage != null &&
      profile.last_exam_percentage < rules.min_percentage
    ) {
      reasons.push(`Minimum ${rules.min_percentage}% in last exam required`);
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}
