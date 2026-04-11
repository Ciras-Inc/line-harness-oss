'use client'

import { useState } from 'react'
import type { Tag } from '@line-crm/shared'
import type { FriendWithTags } from '@/lib/api'
import { api } from '@/lib/api'
import TagBadge from './tag-badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FriendTableProps {
  friends: FriendWithTags[]
  allTags: Tag[]
  onRefresh: () => void
}

export default function FriendTable({ friends, allTags, onRefresh }: FriendTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingTagForFriend, setAddingTagForFriend] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
    setAddingTagForFriend(null)
    setSelectedTagId('')
    setError('')
  }

  const handleAddTag = async (friendId: string) => {
    if (!selectedTagId) return
    setLoading(true)
    setError('')
    try {
      await api.friends.addTag(friendId, selectedTagId)
      setAddingTagForFriend(null)
      setSelectedTagId('')
      onRefresh()
    } catch {
      setError('タグの追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTag = async (friendId: string, tagId: string) => {
    setLoading(true)
    setError('')
    try {
      await api.friends.removeTag(friendId, tagId)
      onRefresh()
    } catch {
      setError('タグの削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  if (friends.length === 0) {
    return (
      <div className="rounded-md border border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">友だちが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      {error && (
        <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                友だち
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                タグ / 流入
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                登録日
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {friends.map((friend) => {
              const isExpanded = expandedId === friend.id
              const isAddingTag = addingTagForFriend === friend.id
              const availableTags = allTags.filter(
                (t) => !friend.tags.some((ft) => ft.id === t.id)
              )

              return (
                <>
                  <tr
                    key={friend.id}
                    className="hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => toggleExpand(friend.id)}
                  >
                    {/* Avatar + Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar size="default">
                          {friend.pictureUrl && (
                            <AvatarImage src={friend.pictureUrl} alt={friend.displayName} />
                          )}
                          <AvatarFallback>
                            {friend.displayName?.charAt(0) ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{friend.displayName}</p>
                          {friend.statusMessage && (
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{friend.statusMessage}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Following status */}
                    <td className="px-4 py-3">
                      {friend.isFollowing ? (
                        <Badge variant="default">フォロー中</Badge>
                      ) : (
                        <Badge variant="secondary">ブロック/退会</Badge>
                      )}
                    </td>

                    {/* Tags + Ref */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(friend as unknown as { refCode?: string }).refCode && (
                          <Badge variant="outline">
                            {(friend as unknown as { refCode: string }).refCode}
                          </Badge>
                        )}
                        {friend.tags.length > 0 ? (
                          friend.tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)
                        ) : !(friend as unknown as { refCode?: string }).refCode ? (
                          <span className="text-xs text-muted-foreground">なし</span>
                        ) : null}
                      </div>
                    </td>

                    {/* Registered date */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(friend.createdAt)}
                    </td>

                    {/* Expand indicator */}
                    <td className="px-4 py-3 text-right">
                      <ChevronDown
                        size={16}
                        className={cn('text-muted-foreground transition-transform inline-block', isExpanded && 'rotate-180')}
                      />
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr key={`${friend.id}-detail`} className="bg-muted/30">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">LINE ユーザーID</p>
                            <p className="text-xs text-foreground font-mono">{friend.lineUserId}</p>
                          </div>

                          {/* タグ管理 */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">タグ管理</p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {friend.tags.map((tag) => (
                                <TagBadge
                                  key={tag.id}
                                  tag={tag}
                                  onRemove={() => handleRemoveTag(friend.id, tag.id)}
                                />
                              ))}
                            </div>

                            {isAddingTag ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <select
                                  className="text-sm border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                  value={selectedTagId}
                                  onChange={(e) => setSelectedTagId(e.target.value)}
                                >
                                  <option value="">タグを選択...</option>
                                  {availableTags.map((tag) => (
                                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleAddTag(friend.id)}
                                  disabled={!selectedTagId || loading}
                                  className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50 transition-opacity hover:opacity-90"
                                >
                                  追加
                                </button>
                                <button
                                  onClick={() => { setAddingTagForFriend(null); setSelectedTagId('') }}
                                  className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground bg-muted hover:bg-muted/80 transition-colors"
                                >
                                  キャンセル
                                </button>
                              </div>
                            ) : (
                              availableTags.length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAddingTagForFriend(friend.id) }}
                                  className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                                >
                                  <span className="text-base leading-none">+</span>
                                  タグを追加
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
