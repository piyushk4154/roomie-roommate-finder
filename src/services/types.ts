export type AccountRole = 'student' | 'owner';

export interface StudentUser {
  uid: string;
  name: string;
  email: string;
  role: AccountRole;
  college: string;
  city: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AppUser = StudentUser;

export interface SignUpInput {
  role: AccountRole;
  name: string;
  email: string;
  password: string;
  college?: string;
  phone?: string;
  city: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface OwnerPublicProfile {
  userId: string;
  name: string;
  city: string;
  bio: string;
  avatar: string;
  isDemo: boolean;
  updatedAt: string;
}

export type GenderOption = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type RoommateGenderPref = 'any' | 'same_gender';
export type RoommateCountPref = 1 | 2 | 3 | 4 | 'flexible';

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
  | 'pets'
  | 'roommateCount';

export type DealBreakerKey =
  | 'smoker'
  | 'drinker'
  | 'loud_noise'
  | 'night_owl'
  | 'frequent_guests'
  | 'non_veg_cooking'
  | 'pets'
  | 'messy_roommate'
  | 'different_group_size';

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
  roommateCount: RoommateCountPref;
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

export type PropertyType = 'single_room' | 'shared_room' | 'pg' | 'flat' | 'hostel';
export type ListingGenderAllowed = 'boys' | 'girls' | 'any';
export type FurnishedStatus = 'furnished' | 'semi' | 'unfurnished';
export type ListingStatus = 'active' | 'paused' | 'rented';

export type ListingAmenity =
  | 'wifi'
  | 'ac'
  | 'meals'
  | 'laundry'
  | 'parking'
  | 'power_backup'
  | 'geyser'
  | 'study_table'
  | 'cctv'
  | 'housekeeping';

export interface ListingAddress {
  street: string;
  area: string;
  city: string;
  pincode: string;
}

export interface ListingHouseRules {
  smokingAllowed: boolean;
  drinkingAllowed: boolean;
  guestsAllowed: boolean;
  curfewTime: string;
  vegOnly: boolean;
  petsAllowed: boolean;
}

export interface Listing {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  propertyType: PropertyType;
  address: ListingAddress;
  rentPerMonth: number;
  securityDeposit: number;
  totalBeds: number;
  availableBeds: number;
  genderAllowed: ListingGenderAllowed;
  furnished: FurnishedStatus;
  amenities: ListingAmenity[];
  houseRules: ListingHouseRules;
  nearbyLandmark: string;
  availableFrom: string;
  description: string;
  photoUrls: string[];
  authorizedConfirmed: boolean;
  status: ListingStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface ConnectRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: RequestStatus;
  message: string;
  listingId?: string;
  listingTitle?: string;
  ownerPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatThread {
  id: string;
  participantIds: [string, string];
  requestId: string;
  listingId?: string;
  listingTitle?: string;
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
  | 'misleading_listing'
  | 'scam_deposit'
  | 'already_rented'
  | 'other';

export interface SafetyReport {
  id: string;
  byUserId: string;
  targetUserId: string;
  listingId?: string;
  targetType?: 'user' | 'listing' | 'owner';
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
