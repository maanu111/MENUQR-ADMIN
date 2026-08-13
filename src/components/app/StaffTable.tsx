"use client";

import { Fragment, useRef, useState, useTransition } from "react";
import {
  changeRole,
  inviteStaff,
  setStaffActive,
} from "@/app/dashboard/staff/actions";
import { Button } from "@/components/ui/Button";
import { StaffPermissions, type PageOption } from "./StaffPermissions";
import { useToast } from "@/components/ui/Toaster";
import type { StaffRole } from "@/generated/prisma";

export type StaffRow = {
  membershipId: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt: string | null;
  /** Page keys this person can open right now. */
  pages: string[];
  /** False when the owner has picked pages by hand. */
  usingDefaults: boolean;
  options: PageOption[];
};

const ROLES: StaffRole[] = ["MANAGER", "WAITER", "KITCHEN"];

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager — everything but billing",
  WAITER: "Waiter — orders, POS, tables",
  KITCHEN: "Kitchen — the queue only",
};

const ROLE_NOTE: Record<StaffRole, string> = {
  OWNER: "Everything, including billing",
  MANAGER: "Everything except billing",
  WAITER: "Orders, POS and tables",
  KITCHEN: "The order queue only",
};

export function StaffTable({
  rows,
  canManageRoles,
}: {
  rows: StaffRow[];
  canManageRoles: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-5">
      <form
        ref={formRef}
        action={(formData) => {
          setError("");
          startTransition(async () => {
            const result = await toast.run(
              () => inviteStaff(formData),
              `${String(formData.get("name") ?? "Staff")} can now sign in`,
            );
            if (!result?.ok) {
              setError(result?.message ?? "");
              return;
            }
            formRef.current?.reset();
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          name="name"
          placeholder="e.g. Sunita Rao"
          aria-label="Name"
          className="h-9 w-40 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-brand"
        />
        <input
          name="email"
          type="email"
          placeholder="e.g. sunita@kesartandoor.in"
          aria-label="Email"
          className="h-9 w-56 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-brand"
        />
        <input
          name="password"
          type="text"
          placeholder="Password — at least 8 characters"
          aria-label="Password"
          className="h-9 w-60 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-brand"
        />
        <select
          name="role"
          aria-label="Role"
          className="h-9 rounded-lg border border-line bg-ground px-2 text-[0.8125rem] outline-none focus:border-brand"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending} className="h-9 px-4 text-[0.8125rem]">
          {pending ? "Creating…" : "Create login"}
        </Button>
        {error ? (
          <span role="alert" className="text-[0.6875rem] text-bad">
            {error}
          </span>
        ) : null}
      </form>


      <div className="overflow-x-auto rounded-xl border border-line bg-ground">
        <table className="w-full min-w-[36rem] text-left">
          <thead>
            <tr className="border-b border-line">
              {["Person", "Role", "Access", "Last seen", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-[0.6875rem] font-medium text-ink-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <Fragment key={row.membershipId}>
              <tr className={row.isActive ? "" : "opacity-50"}>
                <td className="px-4 py-3">
                  <span className="block text-[0.8125rem] font-medium text-ink">
                    {row.name}
                  </span>
                  <span className="block truncate text-[0.6875rem] text-ink-3">
                    {row.email}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {row.role === "OWNER" || !canManageRoles ? (
                    <span className="text-[0.8125rem] text-ink-2">
                      {row.role.toLowerCase()}
                    </span>
                  ) : (
                    <select
                      value={row.role}
                      disabled={pending}
                      onChange={(e) =>
                        startTransition(async () => {
                          const result = await changeRole(
                            row.membershipId,
                            e.target.value as StaffRole,
                          );
                          if (!result.ok) setError(result.message);
                        })
                      }
                      className="h-8 rounded-lg border border-line bg-ground px-2 text-[0.75rem] outline-none focus:border-brand disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.toLowerCase()}
                        </option>
                      ))}
                    </select>
                  )}
                </td>

                <td className="px-4 py-3">
                  {row.role === "OWNER" ? (
                    <span className="text-[0.75rem] text-ink-3">{ROLE_NOTE.OWNER}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing(editing === row.membershipId ? null : row.membershipId)
                      }
                      className="text-left text-[0.75rem] text-ink-2 underline decoration-line underline-offset-4 transition hover:decoration-brand"
                    >
                      {row.usingDefaults
                        ? ROLE_NOTE[row.role]
                        : `${row.pages.length} pages, chosen`}
                    </button>
                  )}
                </td>

                <td className="num px-4 py-3 text-[0.75rem] text-ink-3">
                  {row.lastLoginAt
                    ? new Date(row.lastLoginAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    : "never"}
                </td>

                <td className="px-4 py-3 text-right">
                  {row.role === "OWNER" ? null : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await setStaffActive(
                            row.membershipId,
                            !row.isActive,
                          );
                          if (!result.ok) setError(result.message);
                        })
                      }
                      className="rounded-lg border border-line px-2.5 py-1.5 text-[0.625rem] font-semibold text-ink-2 transition hover:bg-surface-2 disabled:opacity-50"
                    >
                      {row.isActive ? "Remove" : "Restore"}
                    </button>
                  )}
                </td>
              </tr>
              {editing === row.membershipId ? (
                <tr>
                  <td colSpan={5} className="bg-surface px-4 py-4">
                    <StaffPermissions
                      membershipId={row.membershipId}
                      name={row.name}
                      role={row.role}
                      options={row.options}
                      current={row.pages}
                      usingDefaults={row.usingDefaults}
                      onClose={() => setEditing(null)}
                    />
                  </td>
                </tr>
              ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
