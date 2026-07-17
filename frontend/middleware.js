import { NextResponse } from "next/server";

const STUDENT_ROUTES = [
  "/students/dashboard",
  "/students/fees",
  "/students/homework",
  "/students/library",
  "/students/notices",
  "/students/profile",
  "/students/results",
  "/students/services",
  "/students/teachers",
  "/students/timetable",
  "/students/attendance",
  "/students/examinations",
];

const TEACHER_ROUTES = [
  "/teachers/dashboard",
  "/teachers/class",
  "/teachers/fees",
  "/teachers/lectures",
  "/teachers/notices",
  "/teachers/profile",
  "/teachers/results",
  "/teachers/attendance",
];

const ACCOUNTS_ROUTES = [
  "/accounts/dashboard",
  "/fees",
  "/finance",
  "/payroll",
];

const isWithin = (pathname, routes) =>
  routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get("token")?.value;
  const userCookie = request.cookies.get("user")?.value;

  let user = null;
  if (userCookie) {
    try {
      user = JSON.parse(decodeURIComponent(userCookie));
    } catch {
      user = null;
    }
  }

  const isLoggedIn = Boolean(tokenCookie && user);
  if (pathname.startsWith("/login")) {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(roleDashboard(user.role), request.url),
      );
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const studentArea = isWithin(pathname, STUDENT_ROUTES);
  const teacherArea = isWithin(pathname, TEACHER_ROUTES);
  const accountsArea = isWithin(pathname, ACCOUNTS_ROUTES);

  if (user.role === "student" && !studentArea) {
    return NextResponse.redirect(new URL("/students/dashboard", request.url));
  }
  if (user.role === "teacher" && !teacherArea) {
    return NextResponse.redirect(new URL("/teachers/dashboard", request.url));
  }
  if (user.role === "accounts" && !accountsArea) {
    return NextResponse.redirect(new URL("/accounts/dashboard", request.url));
  }
  if (
    user.role === "admin" &&
    (studentArea || teacherArea || pathname === "/accounts/dashboard")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

function roleDashboard(role) {
  if (role === "student") return "/students/dashboard";
  if (role === "teacher") return "/teachers/dashboard";
  if (role === "accounts") return "/accounts/dashboard";
  return "/";
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|login).*)"],
};
