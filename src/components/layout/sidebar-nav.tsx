
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Users, Mail, Bot, Settings as SettingsIcon, MessageSquareText, Send, ListChecks, 
  ChevronDown, Share2, UserCircle2, MessageCircle, Edit3, Lightbulb, Hash, CornerDownRight, ClipboardList, CheckCircle as TaskIcon,
  Brain, SendToBack, ShieldQuestion, BarChartBig, ClipboardCheck, Rss, PenSquare, LayoutDashboard, SendToBack as SendToBackIcon, PlusCircle, Users2, CreditCard, FileText, TrendingUp, BookOpen, Sparkles, PlayCircle, CalendarDays, Shield, Link2, Wand2, Coins, Kanban
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  tooltip: string;
  subItems?: NavItem[];
  disabled?: boolean;
  featureId?: string;
  adminOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, tooltip: 'View your business overview and quick stats' },
  
  { href: '/get-started', label: 'Quick Start Guide', icon: PlayCircle, tooltip: 'NEW? Start here! Learn how to use OmniFlow in 24 hours' },
  
  {
    href: '/digital-card/manage',
    label: 'Digital Cards',
    icon: CreditCard,
    tooltip: 'Create digital business cards with Voice AI chatbot for your team',
    featureId: 'feat_digital_cards',
    subItems: [
      { href: '/digital-card/manage', label: 'My Cards', icon: ClipboardList, tooltip: 'View and edit your business cards' },
      { href: '/digital-card/create', label: 'Create New', icon: PlusCircle, tooltip: 'Make a new digital business card' },
    ]
  },
  
  {
    href: '/crm',
    label: 'My Contacts',
    icon: UserCircle2, 
    tooltip: 'People interested in your business',
    featureId: 'feat_core_crm',
    subItems: [
      { href: '/crm', label: 'All Contacts', icon: Users, tooltip: 'View and manage people interested in your business' },
      { href: '/crm/pipeline', label: 'Sales Pipeline', icon: Kanban, tooltip: 'Track deals and opportunities through stages' },
      { href: '/appointments', label: 'Appointments', icon: CalendarDays, tooltip: 'Schedule and manage appointments with reminders' },
    ]
  },
  
  { href: '/tasks', label: 'Tasks', icon: ClipboardCheck, tooltip: 'Create and track your to-do items', featureId: 'feat_core_crm' },
  
  {
    href: '/campaigns',
    label: 'Campaigns',
    icon: Send,
    tooltip: 'Send emails, SMS & WhatsApp to your customers',
    featureId: 'feat_email_marketing',
    subItems: [
      { href: '/campaigns', label: 'Overview', icon: LayoutDashboard, tooltip: 'See all your campaigns across all channels' },
      { href: '/campaigns/ai-email', label: 'AI Email Campaigns', icon: Sparkles, tooltip: 'Create email campaigns using AI' },
      { href: '/campaigns/ai-email/drafts', label: 'Email Drafts', icon: FileText, tooltip: 'View your saved email drafts' },
      { href: '/campaigns/ai-email/delivery', label: 'Delivery Status', icon: TaskIcon, tooltip: 'Track email delivery progress' },
      { href: '/campaigns/email-lists', label: 'Email Lists', icon: Users, tooltip: 'Create and manage email lists for campaigns' },
      { href: '/campaigns/email-automations', label: 'Email Automations', icon: Bot, tooltip: 'Set up automated email follow-up sequences' },
      { href: '/campaigns/messages', label: 'SMS Campaigns', icon: MessageSquareText, tooltip: 'Send SMS campaigns with personalization', featureId: 'feat_sms_whatsapp' },
      { href: '/campaigns/whatsapp', label: 'WhatsApp', icon: MessageCircle, tooltip: 'Manage lists and send WhatsApp campaigns', featureId: 'feat_sms_whatsapp' },
      { href: '/campaigns/whatsapp/bulk', label: 'WhatsApp Bulk Send', icon: Send, tooltip: 'Send WhatsApp messages to many contacts', featureId: 'feat_sms_whatsapp' },
      { href: '/campaigns/templates', label: 'All Templates', icon: FileText, tooltip: 'Pre-written templates for Email, SMS & WhatsApp' },
    ]
  },
  
  {
    href: '/ai-chat',
    label: 'AI Tools',
    icon: Wand2,
    tooltip: 'AI-powered features to boost productivity',
    featureId: 'feat_ai_content_gen',
    subItems: [
      { href: '/ai-chat', label: 'Smart Chat Helper', icon: Brain, tooltip: 'Get AI help while creating campaigns and content' },
      { href: '/social-media', label: 'Content Writer', icon: PenSquare, tooltip: 'Auto-write posts, emails, and web pages' },
      { href: '/social-media/content-hub', label: 'Content Hub', icon: ClipboardList, tooltip: 'Browse and reuse your saved content' },
      { href: '/ai-campaign-manager', label: 'Ad Copy Generator', icon: BarChartBig, tooltip: 'Create advertising copy for Google, Facebook & more', featureId: 'feat_ai_ads_manager' },
      { href: '/ai-usage', label: 'AI Credits Usage', icon: Coins, tooltip: 'Track your AI credits and usage history' },
    ]
  },
  
  { href: '/advanced-analytics', label: 'Business Reports', icon: TrendingUp, tooltip: 'Track your business performance and revenue', featureId: 'feat_advanced_analytics' },
  
  { href: '/team-management', label: 'My Team', icon: Users, tooltip: 'Invite and manage your team members', featureId: 'feat_core_crm' },
  
  {
    href: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    tooltip: 'Manage your account settings and connections',
    subItems: [
      { href: '/settings', label: 'Account & Plan', icon: CreditCard, tooltip: 'Manage your subscription and team' },
      { href: '/crm/integrations', label: 'CRM Integrations', icon: SendToBack, tooltip: 'Connect HubSpot, Zoho, and other CRM tools' },
      { href: '/settings/enterprise', label: 'Enterprise Settings', icon: Shield, tooltip: 'Lead claiming, audit trail, and auto-distribution for teams', adminOnly: true, featureId: 'feat_enterprise_team' },
    ]
  },
];

const superAdminNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, tooltip: 'Manage all accounts and system settings' },
  { href: '/transactions', label: 'Transactions', icon: CreditCard, tooltip: 'View all payment transactions and revenue' },
  { href: '/super-admin-ai-costs', label: 'AI Costs', icon: Coins, tooltip: 'Monitor AI costs and profitability' },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, tooltip: 'Manage companies, plans, and payment gateways' },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const { isSuperAdmin, appUser, company } = useAuth();
  const { isFeatureEnabled } = useFeatureFlag();
  const [filteredNavItems, setFilteredNavItems] = useState<NavItem[]>([]);

  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'superadmin';

  useEffect(() => {
    const filterItems = async () => {
      if (isSuperAdmin) {
        setFilteredNavItems(superAdminNavItems);
        return;
      }
      const enabledItems: NavItem[] = [];
      for (const item of allNavItems) {
        const parentFeatureEnabled = !item.featureId || await isFeatureEnabled(item.featureId);
        
        if (parentFeatureEnabled) {
          if (item.subItems) {
            const filteredSubItems: NavItem[] = [];
            for (const subItem of item.subItems) {
              const passesAdminCheck = !subItem.adminOnly || isAdmin;
              const passesFeatureCheck = !subItem.featureId || await isFeatureEnabled(subItem.featureId);
              if (passesAdminCheck && passesFeatureCheck) {
                filteredSubItems.push(subItem);
              }
            }
            if (filteredSubItems.length > 0) {
              enabledItems.push({ ...item, subItems: filteredSubItems });
            }
          } else {
            enabledItems.push(item);
          }
        }
      }
      setFilteredNavItems(enabledItems);
    };
    filterItems();
  }, [isSuperAdmin, isFeatureEnabled, appUser, company, isAdmin]);

  const toggleSubMenu = (href: string) => {
    setOpenSubMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

   useEffect(() => {
        const initialOpenState: Record<string, boolean> = {};
        filteredNavItems.forEach(item => {
            if (item.subItems && item.subItems.some(sub => pathname === sub.href || (sub.href !== '/' && pathname.startsWith(sub.href)))) {
                initialOpenState[item.href] = true;
            } else {
                 initialOpenState[item.href] = openSubMenus[item.href] || false;
            }
        });
        setOpenSubMenus(initialOpenState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, filteredNavItems]); 

  return (
    <SidebarMenu className="p-2">
      {filteredNavItems.map((item) => {
        const isParentActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && !item.subItems?.some(sub => pathname.startsWith(sub.href)));
        const isSubMenuOpen = openSubMenus[item.href] || false;

        if (item.subItems) {
          const isAnySubItemActive = item.subItems.some(sub => pathname === sub.href || (sub.href !== item.href && pathname.startsWith(sub.href) && sub.href.length > item.href.length));
          return (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                 isActive={isAnySubItemActive || (isParentActive && item.href === pathname)} 
                 tooltip={{ children: item.tooltip, className: "capitalize" }}
                 onClick={() => toggleSubMenu(item.href)}
                 aria-expanded={isSubMenuOpen}
                 className={cn(
                   "justify-between",
                  (isAnySubItemActive || (isParentActive && item.href === pathname)) && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                 )}
              >
                <div className="flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                </div>
                 <ChevronDown className={cn("h-4 w-4 transform transition-transform duration-200", isSubMenuOpen ? "rotate-180" : "")} />
              </SidebarMenuButton>
              {isSubMenuOpen && (
                 <SidebarMenuSub>
                    {item.subItems.map((subItem) => {
                        const isSubItemActive = pathname === subItem.href || (subItem.href !== item.href && pathname.startsWith(subItem.href) && subItem.href.length > item.href.length);
                        return (
                            <SidebarMenuSubItem key={subItem.href}>
                                <Link href={subItem.href} passHref legacyBehavior>
                                    <SidebarMenuSubButton
                                        asChild
                                        isActive={isSubItemActive}
                                        className={cn(
                                            isSubItemActive && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                                        )}
                                    >
                                        <a>
                                            <subItem.icon className="h-4 w-4 mr-1" />
                                            <span>{subItem.label}</span>
                                        </a>
                                    </SidebarMenuSubButton>
                                </Link>
                            </SidebarMenuSubItem>
                        );
                    })}
                 </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          );
        } else {
          return (
            <SidebarMenuItem key={item.label}>
              <Link href={item.disabled ? "#" : item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={isParentActive && !item.disabled}
                  tooltip={{ children: item.tooltip, className: "capitalize" }}
                  className={cn(
                    "justify-start",
                    (isParentActive && !item.disabled) && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90",
                    item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-sidebar-foreground"
                  )}
                  disabled={item.disabled}
                  onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                >
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
        }
      })}
    </SidebarMenu>
  );
}
