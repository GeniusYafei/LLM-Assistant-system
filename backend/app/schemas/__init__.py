# backend/app/schemas/__init__.py
from .analytics import SummaryOut, DailyPoint, HourlyPoint, TrendsOut
from .auth import RegisterRequest, LoginRequest, UserOut, TokenResponse, OrganizationOut
from .chat import ConversationCreate, ConversationOut, ConversationRename, MessageCreate, MessageOut, ConversationWithMessages
from .file import DocumentOut, FileListOut, UsageOut
from .passwd_reset import ForgotPasswordIn, ResetPasswordIn
from .user_admin import OrganizationMini, UserCardOut, UsersPage, UsersStatsOut, InviteUserIn, InviteUserOut, \
    ChangePasswordIn, ApproveUserIn, UpdateNameIn

__all__ = [
    # auth
    "RegisterRequest", "LoginRequest", "UserOut", "TokenResponse", "OrganizationOut",
    # file
    "DocumentOut", "FileListOut", "UsageOut",
    # analytics
    "SummaryOut", "DailyPoint", "HourlyPoint", "TrendsOut",
    # chat
    "ConversationCreate", "ConversationOut", "ConversationRename", "MessageCreate", "MessageOut", "ConversationWithMessages",
    # user_admin
    "OrganizationMini", "UserCardOut", "UsersPage", "UsersStatsOut", "InviteUserIn", "InviteUserOut",
    "ChangePasswordIn", "ApproveUserIn", "UpdateNameIn",
    # passwd_reset
    "ForgotPasswordIn", "ResetPasswordIn",
]
