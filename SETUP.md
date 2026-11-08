# GSB Attendance — deployment guide

This is a deployable **admin website starter** for GSB Attendance. It includes employee and shift management, manual attendance entry, leave approval, reports/CSV export, and a clearly marked pending BIO-PARK integration page.

## Important current limitations

- The website is not deployed by this source package. You must complete the steps below to publish it.
- The app starts in **Demo preview** when Supabase environment variables are missing. Demo changes are held in browser memory and are not saved.
- The supplied BIO-PARK terminal is **not connected** by this build. The device screen details (device ID 1, local IP 192.168.0.26, firmware ai518_fp26v_v2.13) are shown as reference only. A supported vendor export format, SDK or cloud API is still required.
- This is an admin website starter, not yet an employee Android app. Android app and secure device-sync connector are later phases.
- Do not put a Supabase service-role key in this frontend. Only the publishable/anon key belongs in `VITE_SUPABASE_ANON_KEY`.

## A. Create the database

1. Go to https://supabase.com and create a project.
2. Save the database password securely. Do not send it in chat.
3. Open **SQL Editor** in your Supabase project.
4. Open `supabase/schema.sql` from this project, copy all SQL and run it.
5. Go to **Authentication → Users → Add user**.
6. Create the admin user with the intended email `rakesh15591@gmail.com` and a strong password you choose. Do not enable public signups.
7. Copy the new user's UUID from the Authentication users list.
8. In SQL Editor run the following, replacing `PASTE_AUTH_USER_UUID` with that UUID:

```sql
insert into public.profiles (id, full_name, role)
values ('PASTE_AUTH_USER_UUID', 'GSB Admin', 'admin')
on conflict (id) do update set full_name = excluded.full_name, role = 'admin';
```

The email is not automatically granted admin rights until this profile row exists.

## B. Run locally

Install Node.js LTS from https://nodejs.org.

In a terminal, inside this project folder:

```bash
npm install
cp .env.example .env
```

Edit `.env` with your Supabase **Project URL** and **publishable/anon key** from Supabase → Project Settings → API.

Example:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Then run:

```bash
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173). Sign in with the admin email and password created above.

To make a production build:

```bash
npm run build
```

The built website is written to `dist/`.

## C. Deploy free to Vercel

1. Create a GitHub account at https://github.com if you do not have one.
2. Create a **private** repository named `gsb-attendance`.
3. Upload the contents of this project folder to the repository (the files inside this folder, not the outer ZIP).
4. Create an account at https://vercel.com and choose **Add New → Project**.
5. Import the private `gsb-attendance` repository.
6. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
7. In Vercel project **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase publishable/anon key
8. Deploy. Vercel will assign a URL similar to `gsb-attendance-your-team.vercel.app` (actual name depends on availability).
9. Open the deployed URL and sign in with the admin account.
10. Keep the GitHub repository private. Never commit `.env`, database passwords, or service-role keys.

## D. First-use checklist

- Sign in as the admin.
- Confirm the four sample shifts are present; edit them to your actual timings.
- Add employees with unique employee IDs.
- Assign each employee a shift.
- Enter a test attendance record and verify it appears in the dashboard.
- Export a CSV and check the values.
- Create a backup/retention plan before entering real staff data.

## E. BIO-PARK integration next phase

Before enabling automatic sync, obtain from Team Office / the device supplier:

- Exact model confirmation and supported firmware/communication method.
- Official attendance export instructions or supported SDK/API documentation.
- Whether the desktop software exports CSV/Excel and the exact sample file (remove personal/biometric data before sharing).
- Whether a cloud subscription/API account is required.

Preferred integration: vendor-supported cloud API or a small office-LAN connector that sends **punch events only** to a protected backend endpoint. Do not expose the biometric device directly to the public internet. Do not copy or store face templates in GSB Attendance. Map device user IDs to GSB employee IDs and deduplicate imported punches.

## F. Privacy and security

Attendance and employee records are personal data. Inform employees about the purpose and retention period, restrict admin access, use strong passwords and MFA where available, and follow applicable Indian data-protection and employment requirements. This starter stores employee directory data and attendance punches; it does not collect face images or biometric templates.
