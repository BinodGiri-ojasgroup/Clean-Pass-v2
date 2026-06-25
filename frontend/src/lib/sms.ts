// Sparrow SMS Nepal integration
interface SmsOptions { to: string; message: string; apiKey: string; senderId?: string }

export async function sendSms({ to, message, apiKey, senderId = 'CleanPass' }: SmsOptions): Promise<boolean> {
  try {
    const res = await fetch('https://api.sparrowsms.com/v2/sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: apiKey, from: senderId, to, text: message })
    })
    const data = await res.json()
    return data.response_code === 200
  } catch { return false }
}

export function washApprovedMessage(shopName: string, plateNo: string, packageName: string, activeWashes: number, washGoal: number): string {
  return `CleanPass: Your ${packageName} wash for ${plateNo} has been approved at ${shopName}. ${activeWashes}/${washGoal} washes done. ${washGoal - activeWashes > 0 ? `${washGoal - activeWashes} more for a free wash!` : 'You earned a FREE wash!'}`
}

export function washDueMessage(shopName: string, plateNo: string): string {
  return `CleanPass: Hi! Your vehicle ${plateNo} is due for a wash at ${shopName}. Visit us soon and keep your vehicle clean!`
}
