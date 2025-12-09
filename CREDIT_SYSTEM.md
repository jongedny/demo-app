# Credit Quota System

## Overview

The Another Read application now includes a comprehensive credit quota system that tracks OpenAI API usage for each user. This system allows administrators to allocate credit quotas to users and automatically deducts credits based on API consumption.

## How It Works

### Credit Calculation
- **1 credit = 1,000 tokens**
- Credits are calculated based on total tokens used (prompt + completion tokens)
- Credits are deducted automatically after each successful OpenAI API call

### Tracked Operations
The system currently tracks credits for the following OpenAI operations:

1. **Daily Events Generation** (`daily_events`)
   - Generates up to 4 UK events per day
   - Includes event names, keywords, and descriptions

2. **Content Generation** (`content_generation`)
   - Generates blog post content about events and related books
   - Creates up to 4 content pieces per request

## Database Schema

### Users Table
New columns added:
- `creditQuota` (integer): Total credits allocated to the user
- `creditsUsed` (integer): Total credits consumed by the user

### Credit Usage Table
New table to track individual API calls:
- `id`: Unique identifier
- `userId`: Reference to the user
- `operation`: Type of operation (e.g., "daily_events", "content_generation")
- `tokensUsed`: Total tokens consumed in the API call
- `creditsDeducted`: Credits deducted for this operation
- `metadata`: JSON string with additional details (model, event info, etc.)
- `createdAt`: Timestamp of the operation

## Admin Features

### Assigning Credit Quotas
Administrators can assign and modify credit quotas through the **User Management** page:

1. Navigate to `/users` (Admin only)
2. When adding a new user or editing an existing user, set the "Credit Quota" field
3. The quota represents the total number of credits available to the user

### Viewing Credit Usage
The Users page displays for each user:
- **Credits Remaining / Total Quota** (e.g., "950 / 1,000")
- **Credits Used** (shown in smaller text below)

## User Experience

### Sidebar Display
All authenticated users can view their credit balance in the left sidebar:
- **Credits**: Shows remaining/total (e.g., "950 / 1,000")
- **Visual Progress Bar**: Displays credit consumption with a gradient bar
- Updates automatically after each API operation

### Credit Enforcement
When a user attempts an operation that would exceed their quota:
- The operation is blocked before the API call is made
- An error message displays: "Insufficient credits. You have X credits remaining, but this operation requires Y credits."
- No charges are incurred for blocked operations

## Technical Implementation

### Credit Service (`src/server/services/credits.ts`)
Core functions:
- `checkUserCredits(userId, creditsRequired)`: Validates sufficient balance
- `getUserCreditBalance(userId)`: Returns quota, used, and remaining credits
- `deductCredits(userId, operation, tokensUsed, creditsDeducted, metadata)`: Deducts credits and logs usage
- `calculateCreditsFromTokens(tokensUsed)`: Converts tokens to credits (1000:1 ratio)
- `updateUserCreditQuota(userId, newQuota)`: Updates user's quota (Admin only)

### OpenAI Service Integration
The OpenAI service (`src/server/services/openai.ts`) has been updated to:
1. Accept optional `userId` parameter for credit tracking
2. Capture token usage from OpenAI responses
3. Calculate and deduct credits after successful API calls
4. Log detailed metadata about each operation

### Protected Procedures
Operations that consume credits now require authentication:
- `suggestContent` mutation changed from `publicProcedure` to `protectedProcedure`
- Ensures user identity is known for credit tracking

## Usage Examples

### For Administrators

**Setting a Credit Quota:**
```typescript
// When creating a new user
{
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "securepass123",
  userTier: "User",
  status: "Active",
  creditQuota: 10000  // 10,000 credits = ~10M tokens
}
```

**Updating a Credit Quota:**
```typescript
// Edit user and change creditQuota field
{
  userId: 5,
  creditQuota: 20000  // Increase to 20,000 credits
}
```

### For Developers

**Tracking Credits in a New OpenAI Operation:**
```typescript
// 1. Update function signature to accept userId
export async function myNewAIFunction(
  input: string,
  userId?: number
): Promise<Result> {
  
  // 2. Make OpenAI API call
  const completion = await openai.chat.completions.create({...});
  
  // 3. Track credits if userId provided
  if (userId) {
    const tokensUsed = completion.usage?.total_tokens || 0;
    const creditsDeducted = calculateCreditsFromTokens(tokensUsed);
    
    await deductCredits(
      userId,
      "my_operation_name",
      tokensUsed,
      creditsDeducted,
      {
        model: "gpt-4",
        // ... other metadata
      }
    );
  }
  
  return result;
}
```

## Future Enhancements

Potential improvements to consider:
1. **Credit Purchase System**: Allow users to purchase additional credits
2. **Usage Analytics**: Dashboard showing credit consumption over time
3. **Rate Limiting**: Implement per-hour or per-day limits
4. **Credit Expiration**: Set expiration dates for allocated credits
5. **Tiered Pricing**: Different credit costs for different models (GPT-3.5 vs GPT-4)
6. **Alerts**: Notify users when credits are running low
7. **Audit Trail**: Detailed view of all credit transactions for a user

## Migration Notes

When deploying this feature:
1. Run `npm run db:push` to update the database schema
2. Existing users will have `creditQuota: 0` and `creditsUsed: 0` by default
3. Administrators should assign credit quotas to active users
4. The cron job for daily events does not track credits (runs without userId)
