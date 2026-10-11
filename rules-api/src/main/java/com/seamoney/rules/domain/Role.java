package com.seamoney.rules.domain;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public enum Role {
    OWNER(Arrays.asList(
            Permission.CREATE_PAYMENT, Permission.EDIT_SUPPLIERS, Permission.APPROVE,
            Permission.APPROVE_WALLET, Permission.SEND, Permission.EXPORT,
            Permission.VIEW_AUDIT, Permission.MANAGE_TEAM, Permission.MANAGE_SETTINGS)),
    APPROVER(Arrays.asList(
            Permission.CREATE_PAYMENT, Permission.EDIT_SUPPLIERS, Permission.APPROVE,
            Permission.APPROVE_WALLET, Permission.SEND, Permission.EXPORT,
            Permission.VIEW_AUDIT)),
    OPERATOR(Arrays.asList(
            Permission.CREATE_PAYMENT, Permission.EDIT_SUPPLIERS)),
    ACCOUNTANT(Arrays.asList(
            Permission.EXPORT, Permission.VIEW_AUDIT));

    private final List<Permission> permissions;

    Role(List<Permission> permissions) {
        this.permissions = Collections.unmodifiableList(permissions);
    }

    public List<Permission> getPermissions() {
        return permissions;
    }
}
