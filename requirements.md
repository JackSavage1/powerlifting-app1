# Powerlifting App — Requirements

## Personas

### Athlete
A competitive or recreational powerlifter who logs training sessions, follows coach-assigned programs, and tracks personal progress over time. Cares about ease of logging sets quickly, seeing improvement, and knowing what to do each training day.

**Goals:** Log workouts fast, follow a program, see PRs, track bodyweight over time.

### Coach
A powerlifting coach who manages one or more athletes. Writes structured training programs, assigns them to athletes, and monitors athlete performance and compliance.

**Goals:** Build and assign programs efficiently, monitor athlete progress, identify when athletes are falling behind or hitting PRs.

---

## User Flows

### Flow 1 — Athlete: Log a Workout
1. Athlete opens the app and starts a new session
2. Athlete selects today's date and optionally links it to a program day
3. Athlete optionally logs their bodyweight
4. For each exercise, athlete adds one or more sets with weight, reps, and optional RPE/RIR, notes, and video URL
5. Athlete marks the session as complete

### Flow 2 — Athlete: Mark a Personal Record
1. Athlete navigates to their session history or a specific exercise
2. Athlete finds a set they want to flag as a PR
3. Athlete marks that set as a PR for that exercise

### Flow 3 — Coach: Build and Assign a Program
1. Coach creates a new program with a name, description, and duration in weeks
2. Coach adds training days to the program and populates each day with exercises, target sets, target reps, target weight, and target RPE
3. Coach assigns the program to one or more athletes with a start date

### Flow 4 — Coach: Review Athlete Progress
1. Coach selects an athlete from their roster
2. Coach views the athlete's session history
3. Coach views the athlete's personal records per exercise
4. Coach checks program compliance to see which planned sessions were completed

---

## Requirements

### Accounts & Roles

**REQ-001 — User Registration**
A new user can create an account by providing an email address, password, and selecting a role (athlete or coach).

*Acceptance Criteria:*
- User can register with a unique email address
- User selects either "Athlete" or "Coach" at registration
- Duplicate email addresses are rejected with a clear error
- Password meets a minimum length requirement

---

**REQ-002 — User Login and Logout**
A registered user can log in with their credentials and log out of the app.

*Acceptance Criteria:*
- User can log in with correct email and password
- Incorrect credentials produce an error without revealing which field is wrong
- Logged-in user can log out and their session is ended

---

**REQ-003 — Athlete Profile**
An athlete can view and update their profile information.

*Acceptance Criteria:*
- Profile includes: display name, weight class, date of birth
- Weight is recorded in pounds (lbs)
- Athlete can edit any profile field
- Profile is visible to coaches who have a relationship with the athlete

---

**REQ-004 — Coach Profile**
A coach can view and update their profile information.

*Acceptance Criteria:*
- Profile includes: display name and bio
- Coach can edit any profile field

---

**REQ-005 — Coach-Athlete Relationship**
A coach can add athletes to their roster. An athlete must accept before the relationship is active.

*Acceptance Criteria:*
- Coach can send an invitation to an athlete by email
- Athlete receives the invitation and can accept or decline
- Once accepted, the coach can view the athlete's data
- Coach can remove an athlete from their roster at any time
- Athlete can see which coach(es) they are linked to

---

### Exercise Library

**REQ-006 — Default Exercise List**
The app ships with a default library of common powerlifting exercises.

*Acceptance Criteria:*
- Default library includes at minimum: Squat, Bench Press, Deadlift, Overhead Press, Romanian Deadlift, Barbell Row, Front Squat, Close-Grip Bench Press, Pause Squat, Pause Bench Press
- Default exercises are available to all users without any setup

---

**REQ-007 — Custom Exercises**
Athletes and coaches can add exercises not included in the default library.

*Acceptance Criteria:*
- Any authenticated user can create a custom exercise with a name
- Custom exercises created by a coach are available when building programs
- Custom exercises created by an athlete are available when logging sessions

---

### Programs

**REQ-008 — Create a Program**
A coach can create a structured training program.

*Acceptance Criteria:*
- Program has: name, optional description, duration in weeks, days per week
- Coach can save a program as a draft before assigning it
- Coach can edit or delete a program that has not yet been assigned

---

**REQ-009 — Add Exercises to a Program Day**
A coach can populate each day of a program with exercises and targets.

*Acceptance Criteria:*
- Coach can add one or more exercises to any program day
- Each exercise entry includes: exercise name, target sets, target reps, and optionally target weight (lbs) or target percentage of 1RM, and target RPE
- Coach can reorder, edit, or remove exercises within a day

---

**REQ-010 — Assign Program to Athlete**
A coach can assign a program to one or more athletes.

*Acceptance Criteria:*
- Coach selects a program and one or more athletes from their roster
- Coach sets a start date for the assignment
- Athlete is notified when a program is assigned to them
- A program can be assigned to multiple athletes independently

---

**REQ-011 — View Assigned Program**
An athlete can view their currently assigned program.

*Acceptance Criteria:*
- Athlete can see the full program structure (weeks, days, exercises, targets)
- Athlete can see which day corresponds to today based on the start date
- If no program is assigned, a clear message is shown

---

### Workout Logging

**REQ-012 — Start a Session**
An athlete can start a new workout session.

*Acceptance Criteria:*
- Athlete selects a date for the session (defaults to today)
- Athlete can optionally link the session to a program day
- Athlete can mark a session as unplanned if not following a program
- Only one open session per day is allowed per athlete

---

**REQ-013 — Log Bodyweight**
An athlete can log their bodyweight for a session.

*Acceptance Criteria:*
- Bodyweight field is optional per session
- Bodyweight is recorded in pounds (lbs)
- Athlete can edit bodyweight while the session is open

---

**REQ-014 — Log Sets**
An athlete can log individual sets within a session.

*Acceptance Criteria:*
- Each set includes: exercise (required), weight in lbs (required), reps (required)
- Each set optionally includes: RPE (1–10 scale), RIR (0–5 scale), a video URL, and free-text notes
- Multiple sets for the same exercise can be logged in sequence
- Sets are displayed in the order they were logged

---

**REQ-015 — Edit and Delete Sets**
An athlete can correct or remove sets within an open session.

*Acceptance Criteria:*
- Athlete can edit any field of a set while the session is open
- Athlete can delete a set while the session is open
- Edits and deletions are not permitted after the session is closed

---

**REQ-016 — Close a Session**
An athlete can mark a session as complete.

*Acceptance Criteria:*
- Athlete can add optional overall session notes before closing
- Closing a session locks it against further edits to sets
- Athlete can view a summary of the closed session

---

**REQ-017 — View Session History**
An athlete can browse their past workout sessions.

*Acceptance Criteria:*
- Sessions are listed in reverse-chronological order
- Each entry shows the date, number of exercises, and whether it was linked to a program
- Athlete can tap into any session to see the full detail

---

### Personal Records

**REQ-018 — Mark a PR**
An athlete can manually flag a logged set as a personal record for that exercise.

*Acceptance Criteria:*
- Athlete can flag any set in any closed session as a PR
- A set can only be the active PR for one exercise at a time
- An exercise can have one marked PR at a time; marking a new PR replaces the old one

---

**REQ-019 — View Personal Records**
An athlete can see their current PR for each exercise.

*Acceptance Criteria:*
- PR list shows one entry per exercise that has a marked PR
- Each entry shows: exercise name, weight (lbs), reps, date achieved
- Athlete can navigate from the PR entry to the original session

---

**REQ-020 — Coach Views Athlete PRs**
A coach can view the PR list for any of their athletes.

*Acceptance Criteria:*
- Coach selects an athlete and navigates to their PR list
- PR list shows the same data visible to the athlete
- Coach cannot modify the athlete's PRs

---

### Coach Dashboard

**REQ-021 — View Athlete Session History**
A coach can browse any linked athlete's full session history.

*Acceptance Criteria:*
- Coach selects an athlete and sees their sessions in reverse-chronological order
- Coach can open any session to see full set-by-set detail including RPE, notes, and video links
- Coach cannot edit the athlete's sessions

---

**REQ-022 — Program Compliance View**
A coach can see how consistently an athlete is completing their assigned program.

*Acceptance Criteria:*
- View shows each planned program day and whether a session was logged against it
- Completed days are clearly distinguished from missed days
- View covers the full duration of the assigned program
