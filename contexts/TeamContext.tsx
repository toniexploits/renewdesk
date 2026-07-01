'use client'

import { createContext, useContext } from 'react'

interface TeamContextValue {
  /** The user ID whose data should be queried (owner_id if team member, own id otherwise) */
  effectiveUserId: string | null
  /** The logged-in user's own ID */
  memberId: string | null
  /** The agency owner's ID — null when the user is the owner themselves */
  ownerId: string | null
  /** True when the logged-in user is a team member (not the workspace owner) */
  isTeamMember: boolean
  /** Display name of the owner's workspace — null for owners */
  ownerBusinessName: string | null
}

const TeamContext = createContext<TeamContextValue>({
  effectiveUserId: null,
  memberId: null,
  ownerId: null,
  isTeamMember: false,
  ownerBusinessName: null,
})

export function TeamProvider({
  children,
  memberId,
  ownerId,
  ownerBusinessName,
}: {
  children: React.ReactNode
  memberId: string
  ownerId: string | null
  ownerBusinessName: string | null
}) {
  return (
    <TeamContext.Provider
      value={{
        effectiveUserId: ownerId ?? memberId,
        memberId,
        ownerId,
        isTeamMember: !!ownerId,
        ownerBusinessName,
      }}
    >
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  return useContext(TeamContext)
}
