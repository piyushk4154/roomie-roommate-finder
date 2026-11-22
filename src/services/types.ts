export interface StudentUser {
  uid: string;
  name: string;
  email: string;
  college: string;
  city: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  college: string;
  city: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type GenderOption = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type RoommateGenderPref = 'any' | 'same_gender';

export type SmokingOption = 'never' | 'occasionally' | 'regularly';
export type DrinkingOption = 'never' | 'socially' | 'regularly';
export type YesNoOption = 'yes' | 'no';
export type SleepScheduleOption = 'early_bird' | 'flexible' | 'night_owl';
export type NoiseLevelOption = 'quiet' | 'moderate' | 'loud';
export type HeadphoneUseOption = 'always' | 'sometimes' | 'never';
export type CleanlinessLevel = 1 | 2 | 3 | 4 | 5;
export type GuestsOption = 'never' | 'sometimes' | 'often';
export type StudyHabitsOption = 'silence' | 'background_noise' | 'outside';
export type DietOption = 'vegetarian' | 'eggetarian' | 'non_vegetarian';
export type PetsOption = 'has_pet' | 'likes_pets' | 'dislikes_allergic';

export type LifestyleTraitKey =
  | 'smoking'
  | 'drinking'
  | 'sleepSchedule'
  | 'noiseLevel'
  | 'headphoneUse'
  | 'cleanliness'
  | 'guests'
  | 'studyHabits'
  | 'diet'
  | 'pets';

export type DealBreakerKey =
  | 'smoker'
  | 'drinker'
  | 'loud_noise'
  | 'night_owl'
  | 'frequent_guests'
  | 'non_veg_cooking'
  | 'pets'
  | 'messy_roommate';

export interface ProfileBasics {
  name: string;
  age: number;
  gender: GenderOption;
  college: string;
  courseYear: string;
  bio: string;
  avatar: string; // 'initials' | 'preset:1'..'preset:8'
}

export interface ProfileHousing {
  budgetMin: number;
  budgetMax: number;
  preferredCity: string;
  preferredArea: string;
  moveInDate: string;
  roommateGenderPref: RoommateGenderPref;
}

export interface ProfileLifestyle {
  smoking: SmokingOption;
  okayWithSmoker: YesNoOption;
  drinking: DrinkingOption;
  okayWithDrinker: YesNoOption;
  sleepSchedule: SleepScheduleOption;
  noiseLevel: NoiseLevelOption;
  headphoneUse: HeadphoneUseOption;
  cleanliness: CleanlinessLevel;
  guests: GuestsOption;
  studyHabits: StudyHabitsOption;
  diet: DietOption;
  okayWithNonVegCooking: YesNoOption;
  pets: PetsOption;
}

export type ProfileImportance = Record<LifestyleTraitKey, 1 | 2 | 3 | 4 | 5>;

export interface RoommateProfile {
  userId: string;
  basics: ProfileBasics;
  housing: ProfileHousing;
  lifestyle: ProfileLifestyle;
  importance: ProfileImportance;
  dealBreakers: DealBreakerKey[];
  isComplete: boolean;
  isDemo: boolean;
  updatedAt: string;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface ConnectRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: RequestStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatThread {
  id: string;
  participantIds: [string, string];
  requestId: string;
  lastMessage: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  participantIds: [string, string];
  senderId: string;
  text: string;
  timestamp: string;
  readBy: string[];
}

export type ReportReason =
  | 'fake_profile'
  | 'harassment'
  | 'inappropriate_content'
  | 'other';

export interface SafetyReport {
  id: string;
  byUserId: string;
  targetUserId: string;
  reason: ReportReason;
  notes: string;
  createdAt: string;
}

export interface UserBlock {
  id: string;
  byUserId: string;
  targetUserId: string;
  createdAt: string;
}
