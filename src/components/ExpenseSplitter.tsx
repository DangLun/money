import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CircleCheck, CirclePlus, CircleX } from "lucide-react";

type User = {
  id: number;
  name: string;
};

type Item = {
  id: number;
  name: string;
  total: number;
  contributors: number[]; // id user
  author: number | null; // id user
};

const USERS: User[] = [
  { id: 1, name: "Đăng" },
  { id: 2, name: "Vinh" },
  { id: 3, name: "Trinh" },
  { id: 4, name: "Trăng" },
];

export default function ExpenseSplitter() {
  const [items, setItems] = useState<Item[]>([]);
  const [results, setResults] = useState<Record<string, number>>({}); // "from->to" : số tiền

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        name: "",
        total: 0,
        contributors: [],
        author: null,
      },
    ]);
  };

  const updateItem = (id: number, field: keyof Item, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const toggleContributor = (itemId: number, userId: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              contributors: item.contributors.includes(userId)
                ? item.contributors.filter((u) => u !== userId)
                : [...item.contributors, userId],
            }
          : item
      )
    );
  };

  const deleteItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculate = () => {
    const debts: Record<string, number> = {};

    // Tính tất cả nợ
    items.forEach((item) => {
      if (item.author !== null && item.contributors.length > 0) {
        const share = item.total / item.contributors.length;
        item.contributors.forEach((uid) => {
          if (uid !== item.author) {
            const key = `${uid}->${item.author}`;
            debts[key] = (debts[key] || 0) + share;
          }
        });
      }
    });

    // B1: gom nợ hai chiều
    const pairwise: Record<string, number> = {};
    const seen = new Set<string>();

    Object.entries(debts).forEach(([key, amount]) => {
      const [from, to] = key.split("->").map(Number);
      const reverseKey = `${to}->${from}`;
      if (seen.has(key) || seen.has(reverseKey)) return;

      const reverseAmount = debts[reverseKey] || 0;
      const net = amount - reverseAmount;

      if (net > 0) {
        pairwise[key] = net;
      } else if (net < 0) {
        pairwise[reverseKey] = -net;
      }

      seen.add(key);
      seen.add(reverseKey);
    });

    // B2: tính balance cho mỗi user
    const balances: Record<number, number> = {};
    Object.entries(pairwise).forEach(([key, amount]) => {
      const [from, to] = key.split("->").map(Number);
      balances[from] = (balances[from] || 0) - amount;
      balances[to] = (balances[to] || 0) + amount;
    });

    // B3: tối ưu giao dịch đa chiều
    const payers = Object.entries(balances)
      .filter(([_, bal]) => bal < 0)
      .map(([id, bal]) => ({ id: Number(id), bal: -bal })); // nợ

    const receivers = Object.entries(balances)
      .filter(([_, bal]) => bal > 0)
      .map(([id, bal]) => ({ id: Number(id), bal })); // được nhận

    const netDebts: Record<string, number> = {};

    let i = 0,
      j = 0;
    while (i < payers.length && j < receivers.length) {
      const payer = payers[i];
      const receiver = receivers[j];
      const amount = Math.min(payer.bal, receiver.bal);

      const key = `${payer.id}->${receiver.id}`;
      netDebts[key] = (netDebts[key] || 0) + amount;

      payer.bal -= amount;
      receiver.bal -= amount;

      if (payer.bal === 0) i++;
      if (receiver.bal === 0) j++;
    }

    setResults(netDebts);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="sticky top-0 bg-white z-50 py-2">
        <Button onClick={addItem} className="w-full">
          <CirclePlus className="mr-2" /> Thêm món
        </Button>
      </div>

      {items.map((item) => (
        <Card key={item.id} className="p-4 relative">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold text-blue-500">
                Món
              </CardTitle>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteItem(item.id)}
              >
                <CircleX /> Xóa
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Tên món</Label>
              <Input
                value={item.name}
                onChange={(e) => updateItem(item.id, "name", e.target.value)}
                placeholder="Nhập tên món..."
                className="mt-3"
              />
            </div>
            <div>
              <Label>Tổng số tiền</Label>
              <Input
                type="number"
                value={item.total}
                onChange={(e) =>
                  updateItem(item.id, "total", Number(e.target.value))
                }
                placeholder="Nhập số tiền..."
                className="mt-3"
              />
            </div>

            {/* Chọn chủ món */}
            <div>
              <Label>Chủ món (người mua)</Label>
              <Select
                value={item.author ? String(item.author) : ""}
                onValueChange={(val) =>
                  updateItem(item.id, "author", Number(val))
                }
              >
                <SelectTrigger className="mt-3">
                  <SelectValue placeholder="Chọn chủ món" />
                </SelectTrigger>
                <SelectContent>
                  {USERS.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chọn người góp */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  👥 Chọn người đóng góp
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Chọn người đóng góp</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {USERS.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 border-b py-1"
                    >
                      <Checkbox
                        checked={item.contributors.includes(user.id)}
                        onCheckedChange={() =>
                          toggleContributor(item.id, user.id)
                        }
                      />
                      <span>{user.name}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {item.contributors.length > 0 && (
              <div className="text-sm text-gray-600">
                Người đã chọn:{" "}
                {item.contributors
                  .map((uid) => USERS.find((u) => u.id === uid)?.name)
                  .join(", ")}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {items.length > 0 && (
        <Button
          onClick={calculate}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <CircleCheck /> Tính toán
        </Button>
      )}

      {Object.keys(results).length > 0 && (
        <Card className="p-4 mt-6">
          <CardHeader>
            <CardTitle className="text-2xl text-red-500">Kết quả nợ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(results).map(([key, amount]) => {
              const [fromId, toId] = key.split("->").map(Number);
              const fromUser = USERS.find((u) => u.id === fromId)?.name;
              const toUser = USERS.find((u) => u.id === toId)?.name;
              return (
                <p key={key}>
                  <strong>{fromUser}</strong> cần trả <strong>{toUser}</strong>:{" "}
                  {amount.toLocaleString()} VND
                </p>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
